/** Narrow untrusted JSON/storage values before reading named properties. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Convert an unknown caught value into a user-facing error message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? errorMessage(error) : String(error);
}
