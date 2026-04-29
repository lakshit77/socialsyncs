import { type NextRequest, NextResponse } from "next/server";
import { decodeOAuthState } from "@/lib/oauth-state";
import { getOAuthProvider } from "@/services/oauth/registry";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";

interface RouteParams {
  params: Promise<{ platform: string }>;
}

/**
 * Handles the OAuth authorization callback from the platform.
 *
 * GET /api/v1/auth/[platform]/callback?code=...&state=...
 *
 * Steps:
 * 1. Extract and validate `code` and `state` from query parameters.
 * 2. Decode state to recover userId, platform, and oauthProvider.
 * 3. Re-resolve the SAME credentials used during login (never mix credentials).
 * 4. Exchange the authorization code for access + refresh tokens.
 * 5. Fetch platform account info (channel name, account ID, etc.).
 * 6. Encrypt tokens and upsert the connection row to the database.
 * 7. Redirect the user back to the Settings page with a success indicator.
 *
 * On any error, redirects to /settings with an error query param so the
 * Settings page can show a user-friendly reconnect prompt.
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { platform } = await params;
  const { searchParams } = new URL(request.url);
  const baseUrl = getBaseUrl(request);

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // Handle user-denied or platform-level error redirects.
  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    console.warn("OAuth callback received platform error", { platform, error: oauthError, description });
    return redirectToSettings(baseUrl, platform, "oauth_denied");
  }

  if (!code || !stateParam) {
    return redirectToSettings(baseUrl, platform, "oauth_missing_params");
  }

  // 2. Decode state.
  let statePayload;
  try {
    statePayload = decodeOAuthState(stateParam);
  } catch (err) {
    console.error("OAuth callback: invalid state parameter", { platform, error: err });
    return redirectToSettings(baseUrl, platform, "oauth_invalid_state");
  }

  const { userId, oauthProvider } = statePayload;

  try {
    const connectionService = new OAuthConnectionService();

    // 3. Re-resolve credentials using the same oauthProvider from state.
    // This guarantees the code exchange uses the same client_id/secret that
    // generated the authorization URL — never mix system and custom credentials.
    const { clientId, clientSecret } = await resolveCredentialsForProvider(
      connectionService,
      userId,
      platform,
      oauthProvider
    );

    // 4. Exchange authorization code for tokens.
    const provider = getOAuthProvider(platform);
    const redirectUri = getRedirectUri(request, platform);
    const tokens = await provider.exchangeCode(code, clientId, clientSecret, redirectUri);

    // 5. Fetch platform account info with the fresh access token.
    const accountInfo = await provider.getAccountInfo(tokens.access_token);

    // 6. Encrypt and persist the connection.
    await connectionService.upsertConnection({
      userId,
      platform,
      accountId: accountInfo.accountId,
      accountTitle: accountInfo.accountTitle,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      oauthProvider,
      clientIdUsed: clientId,
      // Only store the client secret when using a custom OAuth app.
      ...(oauthProvider === "custom" ? { clientSecret } : {}),
    });

    console.info("OAuth connection established", {
      userId,
      platform,
      oauthProvider,
      accountTitle: accountInfo.accountTitle,
    });

    // 7. Redirect to Settings with success indicator.
    return NextResponse.redirect(`${baseUrl}/settings?connected=${platform}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OAuth callback failed", { platform, userId, oauthProvider, error: message });
    return redirectToSettings(baseUrl, platform, "oauth_callback_failed");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the OAuth client credentials ensuring the correct provider type is used.
 * When oauthProvider is "system", reads from environment variables.
 * When oauthProvider is "custom", reads from the user's platform_credentials row.
 */
async function resolveCredentialsForProvider(
  service: OAuthConnectionService,
  userId: string,
  platform: string,
  oauthProvider: "system" | "custom"
): Promise<{ clientId: string; clientSecret: string }> {
  const resolved = await service.resolveCredentials(userId, platform);

  // Verify the resolved provider type matches what was used at login.
  // This guards against a race condition where the user updated their custom
  // credentials between login and callback.
  if (resolved.oauthProvider !== oauthProvider) {
    // Fall back to the originally intended provider type.
    // For "system", environment variables are always available.
    // For "custom", if credentials disappeared, we cannot safely exchange the code.
    if (oauthProvider === "custom") {
      throw new Error(
        "Custom OAuth credentials were removed between authorization and callback. " +
          "Please reconnect with your credentials saved."
      );
    }
    // oauthProvider was "system" — use system creds even if custom are now present.
    return {
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
    };
  }

  return { clientId: resolved.clientId, clientSecret: resolved.clientSecret };
}

/**
 * Builds a redirect response to the Settings page with an error query parameter.
 */
function redirectToSettings(
  baseUrl: string,
  platform: string,
  errorCode: string
): NextResponse {
  return NextResponse.redirect(
    `${baseUrl}/settings?error=${errorCode}&platform=${platform}`
  );
}

/**
 * Builds the OAuth redirect URI for the given platform.
 */
function getRedirectUri(request: NextRequest, platform: string): string {
  const platformEnvKey = `${platform.toUpperCase()}_OAUTH_REDIRECT_URI`;
  const platformOverride = process.env[platformEnvKey];
  if (platformOverride) return platformOverride;

  const baseUrl = getBaseUrl(request);
  return `${baseUrl}/api/v1/auth/${platform}/callback`;
}

/**
 * Derives the application base URL.
 */
function getBaseUrl(request: NextRequest): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const { origin } = new URL(request.url);
  return origin;
}
