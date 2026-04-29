import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves the authenticated userId from either a Supabase session cookie
 * or an `Authorization: Bearer <api_key>` header.
 *
 * Returns null when neither method succeeds.
 */
export async function resolveUserId(request: NextRequest): Promise<string | null> {
  // Prefer the Bearer API key if present — this is the n8n / headless path.
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7).trim();
    return resolveUserIdFromApiKey(rawKey);
  }

  // Fall back to the Supabase session cookie (browser / same-origin requests).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Looks up the userId for a plaintext API key.
 * Compares the SHA-256 digest of the incoming key against stored hashes.
 * Updates `last_used_at` on a successful match.
 */
async function resolveUserIdFromApiKey(rawKey: string): Promise<string | null> {
  if (!rawKey || rawKey.length < 8) return null;

  const prefix = rawKey.slice(0, 8);
  const hash = await sha256Hex(rawKey);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("id, user_id, key_hash")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .single<{ id: string; user_id: string; key_hash: string }>();

  if (error || !data) return null;
  if (data.key_hash !== hash) return null;

  // Fire-and-forget: update last_used_at without blocking the request.
  void supabase
    .from("user_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id;
}

/**
 * Generates a cryptographically random API key and returns the key and its
 * SHA-256 hash. The plaintext key is shown to the user once and never stored.
 *
 * Key format: `ss_<32 random hex chars>` (prefix "ss" = SocialSyncs).
 * First 8 characters are used as the lookup prefix stored in the DB.
 */
export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `ss_${hex}`;
  const hash = await sha256Hex(key);
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
