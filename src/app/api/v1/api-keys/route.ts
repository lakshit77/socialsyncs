import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { generateApiKey } from "@/lib/api-auth";
import { createApiKeySchema } from "@/lib/validators";

/**
 * GET /api/v1/api-keys
 * Lists all non-revoked API keys for the authenticated user (masked).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("id, name, prefix, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) return apiError("DB_ERROR", error.message, 500);

  return apiSuccess(data ?? []);
}

/**
 * POST /api/v1/api-keys
 * Creates a new API key. Returns the plaintext key once — it is not stored.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const body = await request.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.issues);
  }

  const { key, hash, prefix } = await generateApiKey();

  const { data, error } = await supabase
    .from("user_api_keys")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      key_hash: hash,
      prefix,
    })
    .select("id, name, prefix, created_at")
    .single();

  if (error) return apiError("DB_ERROR", error.message, 500);

  return apiSuccess({ ...data, key }, 201);
}
