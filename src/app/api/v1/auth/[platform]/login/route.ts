import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encodeOAuthState } from "@/lib/oauth-state";
import { getOAuthProvider, isSupportedOAuthPlatform } from "@/services/oauth/registry";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";

interface RouteParams {
  params: Promise<{ platform: string }>;
}

/**
 * Initiates the OAuth authorization flow for the given platform.
 *
 * GET /api/v1/auth/[platform]/login
 *
 * Steps:
 * 1. Authenticate the requesting user via Supabase session.
 * 2. Validate that the platform slug is registered in the OAuth provider registry.
 * 3. Resolve which OAuth credentials to use (system env vars or user's custom app).
 * 4. Build the platform authorization URL with a signed state parameter.
 * 5. Redirect the browser to the platform's OAuth consent screen.
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { platform } = await params;

  // 1. Authenticate user.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  // 2. Validate platform.
  if (!isSupportedOAuthPlatform(platform)) {
    return NextResponse.json(
      { success: false, error: { code: "UNSUPPORTED_PLATFORM", message: `Platform "${platform}" is not supported for OAuth.` } },
      { status: 400 }
    );
  }

  try {
    // 3. Resolve credentials: user's custom app OR system-level env credentials.
    const connectionService = new OAuthConnectionService();
    const { clientId, oauthProvider } = await connectionService.resolveCredentials(
      user.id,
      platform
    );

    // 4. Build state parameter and authorization URL.
    const state = encodeOAuthState({ userId: user.id, platform, oauthProvider });
    const redirectUri = getRedirectUri(request, platform);
    const provider = getOAuthProvider(platform);
    const authorizationUrl = provider.getAuthorizationUrl(clientId, redirectUri, state);

    // 5. Redirect to the platform OAuth consent screen.
    return NextResponse.redirect(authorizationUrl);
  } catch (err) {
    console.error("OAuth login initiation failed", {
      platform,
      userId: user.id,
      error: err instanceof Error ? err.message : err,
    });

    const baseUrl = getBaseUrl(request);
    const errorMessage = encodeURIComponent(
      err instanceof Error ? err.message : "Failed to initiate OAuth flow."
    );
    return NextResponse.redirect(
      `${baseUrl}/settings?error=oauth_init_failed&platform=${platform}&message=${errorMessage}`
    );
  }
}

/**
 * Builds the OAuth redirect URI for the given platform.
 * Uses the YOUTUBE_OAUTH_REDIRECT_URI env var for YouTube as a convenience alias,
 * falling back to constructing a URL from APP_BASE_URL.
 */
function getRedirectUri(request: NextRequest, platform: string): string {
  // Allow per-platform override via env (e.g. YOUTUBE_OAUTH_REDIRECT_URI).
  const platformEnvKey = `${platform.toUpperCase()}_OAUTH_REDIRECT_URI`;
  const platformOverride = process.env[platformEnvKey];
  if (platformOverride) return platformOverride;

  const baseUrl = getBaseUrl(request);
  return `${baseUrl}/api/v1/auth/${platform}/callback`;
}

/**
 * Derives the application base URL from the request origin or APP_BASE_URL env var.
 */
function getBaseUrl(request: NextRequest): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const { origin } = new URL(request.url);
  return origin;
}
