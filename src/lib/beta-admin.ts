/** Production gate: the allow-listed address must have a trusted Google
 * account; typed email/password alone is not admin evidence. */
export function isAdminIdentity(
  email: string | null,
  allowed: string[],
  providers: string[],
  trustPassword = false,
): boolean {
  return (
    !!email &&
    allowed.includes(email) &&
    (trustPassword || providers.some((p) => p === "google" || p === "grok-google"))
  );
}
