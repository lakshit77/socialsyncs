import type {
  OAuthAccountInfo,
  OAuthProvider,
  OAuthRefreshResponse,
  OAuthTokenResponse,
} from "../types";

/**
 * OAuth 2.0 provider stub for Facebook (Meta Graph API).
 *
 * Will be implemented when the Facebook posting phase begins.
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */
export class FacebookOAuthProvider implements OAuthProvider {
  readonly platformId = "facebook";

  getScopes(): string[] {
    throw new Error("FacebookOAuthProvider is not yet implemented.");
  }

  getAuthorizationUrl(_clientId: string, _redirectUri: string, _state: string): string {
    throw new Error("FacebookOAuthProvider is not yet implemented.");
  }

  async exchangeCode(
    _code: string,
    _clientId: string,
    _clientSecret: string,
    _redirectUri: string
  ): Promise<OAuthTokenResponse> {
    throw new Error("FacebookOAuthProvider is not yet implemented.");
  }

  async refreshAccessToken(
    _refreshToken: string,
    _clientId: string,
    _clientSecret: string
  ): Promise<OAuthRefreshResponse> {
    throw new Error("FacebookOAuthProvider is not yet implemented.");
  }

  async getAccountInfo(_accessToken: string): Promise<OAuthAccountInfo> {
    throw new Error("FacebookOAuthProvider is not yet implemented.");
  }
}
