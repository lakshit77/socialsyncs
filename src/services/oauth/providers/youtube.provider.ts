import type {
  OAuthAccountInfo,
  OAuthProvider,
  OAuthRefreshResponse,
  OAuthTokenResponse,
} from "../types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

interface GoogleTokenApiResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface YouTubeChannelsApiResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
  }>;
}

/**
 * OAuth 2.0 provider implementation for the YouTube Data API v3.
 *
 * Authorization uses Google's OAuth 2.0 endpoint with the youtube.force-ssl scope,
 * which grants read and write access to the authenticated user's YouTube channel.
 */
export class YouTubeOAuthProvider implements OAuthProvider {
  readonly platformId = "youtube";

  /**
   * Returns the Google OAuth scopes required for YouTube comment automation.
   */
  getScopes(): string[] {
    return ["https://www.googleapis.com/auth/youtube.force-ssl"];
  }

  /**
   * Builds the Google OAuth 2.0 authorization URL to redirect the user to.
   *
   * access_type=offline requests a refresh token.
   * prompt=consent forces the consent screen even for already-authorized users,
   * ensuring a fresh refresh token is always returned.
   */
  getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.getScopes().join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  }

  /**
   * Exchanges an authorization code for Google access and refresh tokens.
   *
   * @throws If the token endpoint returns an error or a token is missing.
   */
  async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = (await response.json()) as GoogleTokenApiResponse;

    if (!response.ok || data.error) {
      throw new Error(
        `YouTube token exchange failed: ${data.error_description ?? data.error ?? response.statusText}`
      );
    }

    if (!data.access_token || !data.refresh_token) {
      throw new Error(
        "YouTube token exchange response is missing access_token or refresh_token. " +
          "Ensure prompt=consent is set so Google always returns a refresh token."
      );
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? 3600,
    };
  }

  /**
   * Refreshes an expired access token using a stored refresh token.
   * Must be called with the same client_id/secret that produced the refresh token.
   *
   * @throws If Google returns invalid_grant (refresh token revoked or expired).
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuthRefreshResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    const data = (await response.json()) as GoogleTokenApiResponse;

    if (!response.ok || data.error) {
      throw new Error(
        `YouTube token refresh failed: ${data.error_description ?? data.error ?? response.statusText}`
      );
    }

    if (!data.access_token) {
      throw new Error("YouTube token refresh response is missing access_token.");
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in ?? 3600,
      // Google may rotate the refresh token — preserve the new one if provided.
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    };
  }

  /**
   * Fetches the YouTube channel linked to the authenticated user's Google account.
   * Uses the `mine=true` parameter which resolves the channel from the access token.
   *
   * @throws If the API returns an error or no channel is found.
   */
  async getAccountInfo(accessToken: string): Promise<OAuthAccountInfo> {
    const url = new URL(`${YT_API_BASE}/channels`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await response.json()) as YouTubeChannelsApiResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(
        `Failed to fetch YouTube channel info: ${data.error?.message ?? response.statusText}`
      );
    }

    const channel = data.items?.[0];
    if (!channel?.id || !channel.snippet?.title) {
      throw new Error(
        "No YouTube channel found for this Google account. " +
          "Ensure the account has an associated YouTube channel."
      );
    }

    return {
      accountId: channel.id,
      accountTitle: channel.snippet.title,
    };
  }
}
