// ---------------------------------------------------------------------------
// Token exchange and refresh shapes
// ---------------------------------------------------------------------------

/**
 * Returned by an OAuth provider after a successful authorization code exchange.
 * The refresh_token is long-lived; access_token expires in expires_in seconds.
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Lifetime of the access token in seconds (e.g. 3600). */
  expires_in: number;
}

/**
 * Returned by an OAuth provider after a successful access token refresh.
 * Note: some providers issue a new refresh_token on each refresh (rotation).
 */
export interface OAuthRefreshResponse {
  access_token: string;
  /** Lifetime of the new access token in seconds. */
  expires_in: number;
  /** Some providers (e.g. Google) may rotate the refresh token. */
  refresh_token?: string;
}

/**
 * Normalized account information fetched from the platform after OAuth completes.
 * Maps to the account_id + account_title columns in platform_oauth_connections.
 */
export interface OAuthAccountInfo {
  /** Platform-side account/channel/page ID. */
  accountId: string;
  /** Human-readable account name displayed in the settings UI. */
  accountTitle: string;
}

// ---------------------------------------------------------------------------
// OAuthProvider interface — implemented by each platform provider
// ---------------------------------------------------------------------------

/**
 * Contract that every platform OAuth provider must implement.
 * The factory registry maps platform slugs to instances of this interface.
 */
export interface OAuthProvider {
  /** Lowercase platform slug that this provider handles (e.g. "youtube"). */
  readonly platformId: string;

  /**
   * Returns the OAuth scopes required for this platform's automation features.
   */
  getScopes(): string[];

  /**
   * Builds the authorization URL to redirect the user to for consent.
   *
   * @param clientId - The OAuth client ID (system or custom).
   * @param redirectUri - The callback URI registered with the OAuth app.
   * @param state - The base64url-encoded state payload for CSRF and routing.
   */
  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string;

  /**
   * Exchanges an authorization code for access + refresh tokens.
   *
   * @param code - The authorization code from the callback query string.
   * @param clientId - The same client_id used to generate the authorization URL.
   * @param clientSecret - The matching client secret.
   * @param redirectUri - Must match the redirect URI used in the authorization request.
   */
  exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse>;

  /**
   * Uses a refresh token to obtain a new short-lived access token.
   * Must be called with the SAME client_id/secret that produced the refresh token.
   *
   * @param refreshToken - The stored refresh token.
   * @param clientId - The client_id originally used to authorize.
   * @param clientSecret - The matching client secret.
   */
  refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthRefreshResponse>;

  /**
   * Fetches the platform account details using a valid access token.
   * Called immediately after code exchange to populate account_id and account_title.
   *
   * @param accessToken - A freshly exchanged access token.
   */
  getAccountInfo(accessToken: string): Promise<OAuthAccountInfo>;
}

// ---------------------------------------------------------------------------
// Connection shape — mirrors the platform_oauth_connections DB row
// ---------------------------------------------------------------------------

export type OAuthConnectionStatus = "active" | "expired" | "disconnected";
export type OAuthProviderType = "system" | "custom";

/**
 * Represents a stored OAuth connection row as returned to application code.
 * Sensitive fields (tokens, secrets) are never included in this type —
 * they stay encrypted in the database.
 */
export interface OAuthConnection {
  id: string;
  userId: string;
  platform: string;
  accountId: string;
  accountTitle: string;
  tokenExpiry: Date | null;
  oauthProvider: OAuthProviderType;
  clientIdUsed: string;
  status: OAuthConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Credential resolution — output of resolveCredentials()
// ---------------------------------------------------------------------------

/**
 * Carries the resolved OAuth credentials for initiating or refreshing a connection.
 * Determines whether the SaaS system credentials or the user's own OAuth app is used.
 */
export interface OAuthCredentialResolution {
  clientId: string;
  clientSecret: string;
  oauthProvider: OAuthProviderType;
}

// ---------------------------------------------------------------------------
// Upsert params — input to OAuthConnectionService.upsertConnection()
// ---------------------------------------------------------------------------

export interface UpsertOAuthConnectionParams {
  userId: string;
  platform: string;
  accountId: string;
  accountTitle: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  oauthProvider: OAuthProviderType;
  clientIdUsed: string;
  /** Only required when oauthProvider = "custom". */
  clientSecret?: string;
}
