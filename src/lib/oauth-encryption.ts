import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Resolves the 32-byte AES-256 encryption key used to protect stored OAuth tokens.
 *
 * Resolution order:
 * 1. CREDENTIAL_ENCRYPTION_KEY — explicit 64-char hex string (optional, for advanced users
 *    who want a key completely independent of their Supabase project).
 * 2. SUPABASE_SERVICE_ROLE_KEY — already required for the app to function. Its SHA-256
 *    hash produces a stable, project-scoped 32-byte key with no extra setup needed.
 *
 * This means self-hosted users get working encryption out of the box with zero extra
 * environment variables, while production deployments can still set an independent key.
 *
 * @throws If neither variable is set.
 */
function getEncryptionKey(): Buffer {
  const explicit = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (explicit) {
    if (explicit.length !== 64) {
      throw new Error(
        "CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
      );
    }
    return Buffer.from(explicit, "hex");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    // SHA-256 of the service role key produces a stable 32-byte key tied to this
    // Supabase project. Tokens encrypted here cannot be decrypted by a different project.
    return createHash("sha256").update(serviceKey, "utf8").digest();
  }

  throw new Error(
    "No encryption key available. Set SUPABASE_SERVICE_ROLE_KEY (already required) " +
      "or CREDENTIAL_ENCRYPTION_KEY in .env.local."
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * The returned ciphertext string is self-contained and includes the IV and
 * authentication tag in the format: "<iv_hex>:<tag_hex>:<ciphertext_hex>".
 * This format allows safe storage in a single database column.
 *
 * @param plaintext - The UTF-8 string to encrypt.
 * @returns A colon-separated hex string: "<iv_hex>:<tag_hex>:<ciphertext_hex>".
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext string produced by {@link encrypt}.
 *
 * Verifies the GCM authentication tag before returning plaintext, ensuring
 * that the ciphertext has not been tampered with.
 *
 * @param ciphertext - A colon-separated string in "<iv_hex>:<tag_hex>:<ciphertext_hex>" format.
 * @returns The original plaintext UTF-8 string.
 * @throws If the format is invalid, the key is wrong, or authentication fails.
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected '<iv_hex>:<tag_hex>:<ciphertext_hex>'.");
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
