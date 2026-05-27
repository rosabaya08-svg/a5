import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type EncryptedCredential = {
  version: "aes-256-gcm:v1";
  iv: string;
  authTag: string;
  ciphertext: string;
};

export function canUseCredentialVault(): boolean {
  return Boolean(readMasterKey());
}

export function encryptCredential(value?: string): EncryptedCredential | undefined {
  const plainText = text(value);
  const masterKey = readMasterKey();
  if (!plainText) return undefined;
  if (!masterKey) throw new Error("PG_CREDENTIAL_ENCRYPTION_KEY or PG_SECRET_KEY is required to store PG credentials.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

  return {
    version: "aes-256-gcm:v1",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptCredential(value: unknown): string | undefined {
  const encrypted = asEncryptedCredential(value);
  const masterKey = readMasterKey();
  if (!encrypted) return undefined;
  if (!masterKey) throw new Error("PG credential vault key is missing.");

  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function readMasterKey(): Buffer | undefined {
  const raw = process.env.PG_CREDENTIAL_ENCRYPTION_KEY?.trim() || process.env.PG_SECRET_KEY?.trim() || "";
  if (!raw) return undefined;
  return createHash("sha256").update(raw).digest();
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asEncryptedCredential(value: unknown): EncryptedCredential | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<EncryptedCredential>;
  if (
    candidate.version === "aes-256-gcm:v1" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string"
  ) {
    return candidate as EncryptedCredential;
  }
  return undefined;
}
