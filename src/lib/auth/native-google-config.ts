/** Native Google is enabled only for a complete app-owned credential pair. */
export function hasNativeGoogleCredentials(
  clientId: string | undefined,
  clientSecret: string | undefined,
): boolean {
  return Boolean(clientId && clientSecret);
}
