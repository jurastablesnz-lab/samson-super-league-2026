/**
 * Extra public hostnames (custom domains) this deployment answers on.
 *
 * The deployer injects `BETTER_AUTH_URL` as the app's grok.me address
 * (https://samson2026.grok.me). Riders use the custom domain
 * https://app.xsalute.co.nz, which points at the SAME deployment. With only the
 * grok.me URL as Better Auth's base URL, every sign-in request from the custom
 * domain fails with "Invalid origin", and Google would send people back to the
 * grok.me host, where the sign-in state cookie does not exist.
 *
 * `APP_CUSTOM_HOSTS` (comma-separated hostnames) overrides the default list;
 * set it to `off` to go back to the injected URL only.
 */
export const DEFAULT_CUSTOM_HOSTS: readonly string[] = ["app.xsalute.co.nz"];

/** Parse `APP_CUSTOM_HOSTS` into bare lowercase hostnames. */
export function parseCustomHosts(raw: string | undefined): string[] {
  const value = raw?.trim();
  if (!value) return [...DEFAULT_CUSTOM_HOSTS];
  if (value.toLowerCase() === "off") return [];
  return value
    .split(/[,\s]+/)
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, ""),
    )
    .filter((h) => /^[a-z0-9.-]+(:\d+)?$/.test(h));
}

/** Hostname of an absolute URL, or null. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Better Auth `baseURL` for a deployment with an injected `BETTER_AUTH_URL`.
 * With custom hosts, returns a dynamic config so each host gets its own
 * callback URL and origin; requests on any other host fall back to the
 * injected URL (the previous behaviour).
 */
export function deployedBaseURL(
  explicitBaseURL: string,
  customHosts: readonly string[],
): string | { allowedHosts: string[]; protocol: "https"; fallback: string } {
  const injected = hostOf(explicitBaseURL);
  const extras = customHosts.filter((h) => h && h !== injected);
  if (!injected || extras.length === 0) return explicitBaseURL;
  return { allowedHosts: [injected, ...extras], protocol: "https", fallback: explicitBaseURL };
}

/** Origins to trust for credentialed auth POSTs, in addition to the base URL. */
export function customHostOrigins(customHosts: readonly string[]): string[] {
  return customHosts.map((h) => `https://${h}`);
}

/**
 * The address to put in emails (admin links): the first custom domain when
 * there is one, else the injected URL.
 */
export function publicAppUrl(
  explicitBaseURL: string | undefined,
  customHosts: readonly string[],
): string | null {
  if (customHosts.length > 0) return `https://${customHosts[0]}`;
  return explicitBaseURL ? explicitBaseURL.replace(/\/+$/, "") : null;
}
