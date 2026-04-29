import type {
  OAuthAccountInfo,
  OAuthProvider,
  OAuthRefreshResponse,
  OAuthTokenResponse,
} from "../types";

/**
 * OAuth 2.0 provider stub for Instagram (Meta Graph API).
 *
 * Instagram currently uses manual long-lived token entry on the Settings page.
 * This provider will be implemented when Instagram OAuth is migrated to the
 * generic OAuth flow in a future phase.
 *
 * @see https://developers.facebook.com/docs/instagram-basic-display-api/overview/authorization-window
 */
export class InstagramOAuthProvider implements OAuthProvider {
  readonly platformId = "instagram";

  getScopes(): string[] {
    throw new Error("InstagramOAuthProvider is not yet implemented.");
  }

  getAuthorizationUrl(_clientId: string, _redirectUri: string, _state: string): string {
    throw new Error("InstagramOAuthProvider is not yet implemented.");
  }

  async exchangeCode(
    _code: string,
    _clientId: string,
    _clientSecret: string,
    _redirectUri: string
  ): Promise<OAuthTokenResponse> {
    throw new Error("InstagramOAuthProvider is not yet implemented.");
  }

  async refreshAccessToken(
    _refreshToken: string,
    _clientId: string,
    _clientSecret: string
  ): Promise<OAuthRefreshResponse> {
    throw new Error("InstagramOAuthProvider is not yet implemented.");
  }

  async getAccountInfo(_accessToken: string): Promise<OAuthAccountInfo> {
    throw new Error("InstagramOAuthProvider is not yet implemented.");
  }
}
