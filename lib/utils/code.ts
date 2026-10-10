const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — avoids transcription errors

function randomSuffix(length = 5): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function datePart(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Builds a human-readable, sortable business code such as `BTH-20261010-7K3QX`.
 *
 * The random suffix means collisions are possible in principle, so callers must
 * keep the unique index on the column and retry via `withUniqueCode`.
 */
export function generateCode(prefix: string, date = new Date()): string {
  return `${prefix}-${datePart(date)}-${randomSuffix()}`;
}

export const CodePrefix = {
  batch: "BTH",
  distribution: "DST",
  incident: "INC",
} as const;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Retries `create` with a fresh code when the unique index rejects a collision.
 * Any other error is rethrown untouched.
 */
export async function withUniqueCode<T>(
  prefix: string,
  create: (code: string) => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await create(generateCode(prefix));
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
