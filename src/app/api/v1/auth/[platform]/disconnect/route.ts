import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupportedOAuthPlatform } from "@/services/oauth/registry";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";

interface RouteParams {
  params: Promise<{ platform: string }>;
}

/**
 * Marks the user's OAuth connection for the given platform as disconnected.
 *
 * POST /api/v1/auth/[platform]/disconnect
 *
 * This does NOT revoke the token with the platform (the user can do that from
 * their platform settings). It simply marks the local connection as disconnected
 * so the system stops using the stored tokens.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { platform } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  if (!isSupportedOAuthPlatform(platform)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNSUPPORTED_PLATFORM", message: `Platform "${platform}" is not supported.` },
      },
      { status: 400 }
    );
  }

  try {
    const connectionService = new OAuthConnectionService();
    await connectionService.markDisconnected(user.id, platform);
    return NextResponse.json({ success: true, data: { platform } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to disconnect account.";
    console.error("OAuth disconnect failed", { userId: user.id, platform, error: message });
    return NextResponse.json(
      { success: false, error: { code: "DISCONNECT_FAILED", message } },
      { status: 500 }
    );
  }
}
