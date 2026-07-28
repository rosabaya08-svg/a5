import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const passwordHashAlgorithm = "pbkdf2_sha256";
const passwordHashIterations = 210000;
const passwordHashKeyLength = 32;

export function hashCompanyPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, passwordHashIterations, passwordHashKeyLength, "sha256").toString("base64url");
  return `${passwordHashAlgorithm}$${passwordHashIterations}$${salt}$${hash}`;
}

export function verifyCompanyPassword(input: {
  password: string;
  passwordHash?: string;
  legacyPassword?: string;
}) {
  const password = input.password.trim();

  if (input.passwordHash) {
    const [algorithm, iterationsText, salt, expectedHash] = input.passwordHash.split("$");
    const iterations = Number(iterationsText);

    if (
      algorithm === passwordHashAlgorithm &&
      Number.isInteger(iterations) &&
      iterations > 0 &&
      salt &&
      expectedHash
    ) {
      const actual = Buffer.from(pbkdf2Sync(password, salt, iterations, passwordHashKeyLength, "sha256").toString("base64url"));
      const expected = Buffer.from(expectedHash);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    }
  }

  return Boolean(input.legacyPassword) && input.legacyPassword === password;
}
