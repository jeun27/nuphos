/** Sign-in codes are six digits. */
export const CODE_LENGTH = 6

/** What typing, pasting or one-time-code autofill leaves in the field: digits only, at most six. */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
}

/** A code submits by itself when an edit makes it complete, not on every later change. */
export function completesCode(previous: string, next: string): boolean {
  return next.length === CODE_LENGTH && next !== previous
}

/**
 * Lets one call run at a time and drops the rest, so a code that submits by itself
 * and an Enter or click right after it send a single request.
 */
export function singleFlight<A extends unknown[]>(
  run: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  let inFlight: Promise<void> | null = null

  return (...args) => {
    inFlight ??= run(...args).finally(() => {
      inFlight = null
    })

    return inFlight
  }
}
