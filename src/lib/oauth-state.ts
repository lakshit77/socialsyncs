/**
 * Encodes and decodes the OAuth `state` parameter passed through the authorization
 * redirect to the callback endpoint.
 *
 * The state is a base64url-encoded JSON object. It is NOT signed or encrypted —
 * it is used only to carry non-secret routing metadata (user_id, platform,
 * oauth_provider). The callback re-validates the user session independently
 * through Supabase Auth, so the state alone cannot be used to hijack a session.
 */

export interface OAuthStatePayload {
  /** Supabase user UUID of the initiating user. */
  userId: string;
  /** Lowercase platform slug, e.g. "youtube", "instagram". */
  platform: string;
  /** Whether to use system-level or user-supplied OAuth credentials. */
  oauthProvider: "system" | "custom";
}

/**
 * Encodes an {@link OAuthStatePayload} into a base64url string safe for use
 * as an OAuth `state` query parameter.
 *
 * @param payload - The state data to encode.
 * @returns A base64url-encoded JSON string.
 */
export function encodeOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Decodes a base64url state string back into an {@link OAuthStatePayload}.
 *
 * @param state - The base64url-encoded state string from the OAuth callback.
 * @returns The decoded payload.
 * @throws If the string is not valid base64url JSON or is missing required fields.
 */
export function decodeOAuthState(state: string): OAuthStatePayload {
  let parsed: unknown;
  try {
    const json = Buffer.from(state, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    throw new Error("OAuth state parameter is malformed or corrupted.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).userId !== "string" ||
    typeof (parsed as Record<string, unknown>).platform !== "string" ||
    ((parsed as Record<string, unknown>).oauthProvider !== "system" &&
      (parsed as Record<string, unknown>).oauthProvider !== "custom")
  ) {
    throw new Error("OAuth state parameter contains invalid or missing fields.");
  }

  return parsed as OAuthStatePayload;
}
