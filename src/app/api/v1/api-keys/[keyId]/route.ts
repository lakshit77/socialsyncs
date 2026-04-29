import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * DELETE /api/v1/api-keys/:keyId
 * Revokes (soft-deletes) an API key owned by the authenticated user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const { keyId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const { error } = await supabase
    .from("user_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) return apiError("DB_ERROR", error.message, 500);

  return apiSuccess({ revoked: true });
}
