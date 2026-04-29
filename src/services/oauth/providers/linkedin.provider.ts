import type {
  OAuthAccountInfo,
  OAuthProvider,
  OAuthRefreshResponse,
  OAuthTokenResponse,
} from "../types";

/**
 * OAuth 2.0 provider stub for LinkedIn (LinkedIn API v2).
 *
 * Will be implemented when the LinkedIn posting phase begins.
 *
 * @see https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */
export class LinkedInOAuthProvider implements OAuthProvider {
  readonly platformId = "linkedin";

  getScopes(): string[] {
    throw new Error("LinkedInOAuthProvider is not yet implemented.");
  }

  getAuthorizationUrl(_clientId: string, _redirectUri: string, _state: string): string {
    throw new Error("LinkedInOAuthProvider is not yet implemented.");
  }

  async exchangeCode(
    _code: string,
    _clientId: string,
    _clientSecret: string,
    _redirectUri: string
  ): Promise<OAuthTokenResponse> {
    throw new Error("LinkedInOAuthProvider is not yet implemented.");
  }

  async refreshAccessToken(
    _refreshToken: string,
    _clientId: string,
    _clientSecret: string
  ): Promise<OAuthRefreshResponse> {
    throw new Error("LinkedInOAuthProvider is not yet implemented.");
  }

  async getAccountInfo(_accessToken: string): Promise<OAuthAccountInfo> {
    throw new Error("LinkedInOAuthProvider is not yet implemented.");
  }
}
