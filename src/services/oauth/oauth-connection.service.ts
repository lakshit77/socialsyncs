import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/oauth-encryption";
import { getOAuthProvider } from "./registry";
import type {
  OAuthConnection,
  OAuthConnectionStatus,
  OAuthCredentialResolution,
  OAuthProviderType,
  UpsertOAuthConnectionParams,
} from "./types";

/** Two-minute buffer before token expiry triggers a proactive refresh. */
const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000;

/**
 * Thrown when an OAuth access token cannot be refreshed and the user must
 * manually reconnect their account via the OAuth consent flow.
 * Callers should surface this as a "Reconnect your account" prompt.
 */
export class OAuthTokenExpiredError extends Error {
  public readonly platform: string;
  public readonly reconnectUrl: string;

  constructor(platform: string) {
    super(
      `Your ${platform} connection has expired and could not be refreshed automatically. ` +
        `Please reconnect your account from the Settings page.`
    );
    this.name = "OAuthTokenExpiredError";
    this.platform = platform;
    this.reconnectUrl = `/api/v1/auth/${platform}/login`;
  }
}

/**
 * Raw DB row shape as returned by Supabase for platform_oauth_connections.
 * Only columns actually used in this service are listed.
 */
interface OAuthConnectionRow {
  id: string;
  user_id: string;
  platform: string;
  account_id: string;
  account_title: string;
  refresh_token_encrypted: string;
  access_token_encrypted: string | null;
  token_expiry: string | null;
  oauth_provider: OAuthProviderType;
  client_id_used: string;
  client_secret_encrypted: string | null;
  status: OAuthConnectionStatus;
  created_at: string;
  updated_at: string;
}

/** Shape stored in platform_credentials.credentials for custom OAuth app credentials. */
interface CustomOAuthAppCredentials {
  client_id?: string;
  client_secret?: string;
}

/**
 * Service responsible for the full lifecycle of platform OAuth connections.
 *
 * Responsibilities:
 * - Resolving which OAuth credentials (system vs custom) to use for a given user + platform.
 * - Providing a valid access token, transparently refreshing when expired.
 * - Storing new connections after a successful OAuth callback.
 * - Marking connections as expired when the platform rejects the refresh token.
 * - Exposing connection status for the settings UI.
 *
 * All token reads and writes use the admin Supabase client (service role) to
 * bypass RLS, as these operations run server-side in API routes and background jobs.
 */
export class OAuthConnectionService {
  /**
   * Determines which OAuth client credentials to use for the given user and platform.
   *
   * Resolution logic:
   * - If the user has BOTH client_id AND client_secret stored in platform_credentials
   *   for this platform, those are used and oauth_provider is set to "custom".
   * - Otherwise, the system-level environment variables are used and oauth_provider
   *   is set to "system".
   *
   * @param userId - Supabase user UUID.
   * @param platform - Lowercase platform slug (e.g. "youtube").
   * @throws If the platform has no system credentials configured in environment variables.
   */
  async resolveCredentials(
    userId: string,
    platform: string
  ): Promise<OAuthCredentialResolution> {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("platform_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", `${platform}_oauth_app`)
      .maybeSingle<{ credentials: CustomOAuthAppCredentials }>();

    const customClientId = data?.credentials?.client_id?.trim();
    const customClientSecret = data?.credentials?.client_secret?.trim();

    if (customClientId && customClientSecret) {
      return {
        clientId: customClientId,
        clientSecret: customClientSecret,
        oauthProvider: "custom",
      };
    }

    const systemClientId = this.getSystemClientId(platform);
    const systemClientSecret = this.getSystemClientSecret(platform);

    return {
      clientId: systemClientId,
      clientSecret: systemClientSecret,
      oauthProvider: "system",
    };
  }

  /**
   * Returns a valid access token for the given user and platform.
   *
   * If the cached access token is still valid (with a 2-minute buffer), it is
   * returned immediately. Otherwise the refresh token is used to obtain a new
   * access token, which is then cached back to the database.
   *
   * @param userId - Supabase user UUID.
   * @param platform - Lowercase platform slug.
   * @throws If no active connection exists, or if the refresh token is invalid.
   */
  async getValidAccessToken(userId: string, platform: string): Promise<string> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("platform_oauth_connections")
      .select(
        "id, refresh_token_encrypted, access_token_encrypted, token_expiry, " +
          "oauth_provider, client_id_used, client_secret_encrypted, status"
      )
      .eq("user_id", userId)
      .eq("platform", platform)
      .single<
        Pick<
          OAuthConnectionRow,
          | "id"
          | "refresh_token_encrypted"
          | "access_token_encrypted"
          | "token_expiry"
          | "oauth_provider"
          | "client_id_used"
          | "client_secret_encrypted"
          | "status"
        >
      >();

    if (error || !data) {
      throw new Error(
        `No OAuth connection found for platform "${platform}". ` +
          "Please connect your account from the Settings page."
      );
    }

    if (data.status === "expired") {
      throw new Error(
        `Your ${platform} connection has expired. Please reconnect from the Settings page.`
      );
    }

    if (data.status === "disconnected") {
      throw new Error(
        `Your ${platform} account has been disconnected. Please reconnect from the Settings page.`
      );
    }

    // Return cached access token if it is still valid.
    if (data.access_token_encrypted && data.token_expiry) {
      const expiry = new Date(data.token_expiry).getTime();
      if (Date.now() + TOKEN_EXPIRY_BUFFER_MS < expiry) {
        return decrypt(data.access_token_encrypted);
      }
    }

    // Access token is missing or expired — refresh it.
    return this.refreshAndCacheToken(userId, platform, data);
  }

  /**
   * Stores or replaces a platform OAuth connection after a successful OAuth callback.
   * Uses upsert on (user_id, platform) so reconnecting replaces the existing row.
   *
   * @param params - All fields required to create or update the connection.
   */
  async upsertConnection(params: UpsertOAuthConnectionParams): Promise<void> {
    const supabase = createAdminClient();
    const tokenExpiry = new Date(Date.now() + params.expiresIn * 1000).toISOString();

    const row = {
      user_id: params.userId,
      platform: params.platform,
      account_id: params.accountId,
      account_title: params.accountTitle,
      refresh_token_encrypted: encrypt(params.refreshToken),
      access_token_encrypted: encrypt(params.accessToken),
      token_expiry: tokenExpiry,
      oauth_provider: params.oauthProvider,
      client_id_used: params.clientIdUsed,
      client_secret_encrypted:
        params.oauthProvider === "custom" && params.clientSecret
          ? encrypt(params.clientSecret)
          : null,
      status: "active" as const,
    };

    const { error } = await supabase
      .from("platform_oauth_connections")
      .upsert(row, { onConflict: "user_id,platform" });

    if (error) {
      throw new Error(`Failed to store OAuth connection for ${params.platform}: ${error.message}`);
    }
  }

  /**
   * Marks a connection as expired.
   * Called when the platform returns an invalid_grant error during token refresh,
   * meaning the refresh token has been revoked and the user must reconnect.
   *
   * @param userId - Supabase user UUID.
   * @param platform - Lowercase platform slug.
   */
  async markExpired(userId: string, platform: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("platform_oauth_connections")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("platform", platform);

    if (error) {
      console.error("Failed to mark OAuth connection as expired", {
        userId,
        platform,
        error: error.message,
      });
    }
  }

  /**
   * Marks a connection as disconnected.
   * Called when the user explicitly disconnects their account from the Settings page.
   *
   * @param userId - Supabase user UUID.
   * @param platform - Lowercase platform slug.
   */
  async markDisconnected(userId: string, platform: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("platform_oauth_connections")
      .update({ status: "disconnected" })
      .eq("user_id", userId)
      .eq("platform", platform);

    if (error) {
      throw new Error(
        `Failed to disconnect ${platform} account: ${error.message}`
      );
    }
  }

  /**
   * Retrieves the public-facing connection details for a user and platform.
   * Does NOT include any encrypted token fields — only metadata safe to pass to the UI.
   *
   * @param userId - Supabase user UUID.
   * @param platform - Lowercase platform slug.
   * @returns The connection, or null if no connection exists.
   */
  async getConnection(userId: string, platform: string): Promise<OAuthConnection | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("platform_oauth_connections")
      .select(
        "id, user_id, platform, account_id, account_title, token_expiry, " +
          "oauth_provider, client_id_used, status, created_at, updated_at"
      )
      .eq("user_id", userId)
      .eq("platform", platform)
      .maybeSingle<
        Pick<
          OAuthConnectionRow,
          | "id"
          | "user_id"
          | "platform"
          | "account_id"
          | "account_title"
          | "token_expiry"
          | "oauth_provider"
          | "client_id_used"
          | "status"
          | "created_at"
          | "updated_at"
        >
      >();

    if (error) {
      throw new Error(`Failed to fetch ${platform} connection: ${error.message}`);
    }
    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      platform: data.platform,
      accountId: data.account_id,
      accountTitle: data.account_title,
      tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : null,
      oauthProvider: data.oauth_provider,
      clientIdUsed: data.client_id_used,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Refreshes the access token using the stored refresh token and caches the
   * new access token back to the database.
   *
   * On invalid_grant, marks the connection as expired and rethrows so the caller
   * can surface a reconnect prompt to the user.
   */
  private async refreshAndCacheToken(
    userId: string,
    platform: string,
    row: Pick<
      OAuthConnectionRow,
      | "id"
      | "refresh_token_encrypted"
      | "oauth_provider"
      | "client_id_used"
      | "client_secret_encrypted"
    >
  ): Promise<string> {
    const provider = getOAuthProvider(platform);
    const refreshToken = decrypt(row.refresh_token_encrypted);

    let clientId: string;
    let clientSecret: string;

    if (row.oauth_provider === "custom") {
      if (!row.client_secret_encrypted) {
        throw new Error(
          `OAuth connection for ${platform} is marked "custom" but has no stored client secret.`
        );
      }
      clientId = row.client_id_used;
      clientSecret = decrypt(row.client_secret_encrypted);
    } else {
      clientId = this.getSystemClientId(platform);
      clientSecret = this.getSystemClientSecret(platform);
    }

    let refreshResponse;
    try {
      refreshResponse = await provider.refreshAccessToken(refreshToken, clientId, clientSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Detect invalid_grant (revoked or expired refresh token).
      if (message.toLowerCase().includes("invalid_grant")) {
        await this.markExpired(userId, platform);
      }
      throw new Error(`Token refresh failed for ${platform}: ${message}`);
    }

    const supabase = createAdminClient();
    const tokenExpiry = new Date(
      Date.now() + refreshResponse.expires_in * 1000
    ).toISOString();

    const updatePayload: Record<string, string> = {
      access_token_encrypted: encrypt(refreshResponse.access_token),
      token_expiry: tokenExpiry,
    };

    // Some providers (Google) rotate the refresh token on each refresh.
    if (refreshResponse.refresh_token) {
      updatePayload.refresh_token_encrypted = encrypt(refreshResponse.refresh_token);
    }

    await supabase
      .from("platform_oauth_connections")
      .update(updatePayload)
      .eq("id", row.id);

    return refreshResponse.access_token;
  }

  /** Reads the system-level OAuth client ID for a platform from environment variables. */
  private getSystemClientId(platform: string): string {
    const envKey = `${platform.toUpperCase()}_CLIENT_ID`;
    const value = process.env[envKey];
    if (!value) {
      // Fall back to generic GOOGLE_ prefix for YouTube/Gmail.
      if (platform === "youtube") {
        const google = process.env.GOOGLE_CLIENT_ID;
        if (google) return google;
      }
      throw new Error(
        `System OAuth client ID not configured. Set ${envKey} (or GOOGLE_CLIENT_ID for YouTube) in .env.local.`
      );
    }
    return value;
  }

  /** Reads the system-level OAuth client secret for a platform from environment variables. */
  private getSystemClientSecret(platform: string): string {
    const envKey = `${platform.toUpperCase()}_CLIENT_SECRET`;
    const value = process.env[envKey];
    if (!value) {
      if (platform === "youtube") {
        const google = process.env.GOOGLE_CLIENT_SECRET;
        if (google) return google;
      }
      throw new Error(
        `System OAuth client secret not configured. Set ${envKey} (or GOOGLE_CLIENT_SECRET for YouTube) in .env.local.`
      );
    }
    return value;
  }

  /**
   * Executes a platform API call with automatic token refresh on 401.
   *
   * Flow:
   *  1. Get a valid access token (may return cached one).
   *  2. Run the caller's `fn(accessToken)`.
   *  3. If the API returns a 401 (token revoked / invalidated before expiry):
   *     a. Force a token refresh by clearing the cached expiry and retrying.
   *     b. Re-run `fn` with the fresh token.
   *     c. If still 401, mark the connection as expired and throw
   *        `OAuthTokenExpiredError` so the caller can surface a reconnect prompt.
   *
   * @param userId - The authenticated user's ID.
   * @param platform - The platform identifier (e.g. "youtube").
   * @param fn - Async function that receives an access token and calls the platform API.
   *             Must throw an error with a `statusCode` property equal to 401 on auth failure.
   */
  async withTokenAutoRefresh<T>(
    userId: string,
    platform: string,
    fn: (accessToken: string) => Promise<T>
  ): Promise<T> {
    const accessToken = await this.getValidAccessToken(userId, platform);

    try {
      return await fn(accessToken);
    } catch (err) {
      // Only retry on 401 — other errors propagate normally.
      const is401 =
        err instanceof Error &&
        "statusCode" in err &&
        (err as unknown as { statusCode: number }).statusCode === 401;

      if (!is401) throw err;

      // Force a refresh by clearing the stored expiry so getValidAccessToken
      // bypasses the cache and calls the refresh endpoint.
      const supabase = createAdminClient();
      await supabase
        .from("platform_oauth_connections")
        .update({ token_expiry: null })
        .eq("user_id", userId)
        .eq("platform", platform);

      let freshToken: string;
      try {
        freshToken = await this.getValidAccessToken(userId, platform);
      } catch (refreshErr) {
        await this.markExpired(userId, platform);
        throw new OAuthTokenExpiredError(platform);
      }

      try {
        return await fn(freshToken);
      } catch (retryErr) {
        const still401 =
          retryErr instanceof Error &&
          "statusCode" in retryErr &&
          (retryErr as unknown as { statusCode: number }).statusCode === 401;

        if (still401) {
          await this.markExpired(userId, platform);
          throw new OAuthTokenExpiredError(platform);
        }

        throw retryErr;
      }
    }
  }
}
