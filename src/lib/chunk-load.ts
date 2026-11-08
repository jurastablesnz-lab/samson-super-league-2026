/**
 * Lazy route chunks (the admin page, the test catalogue) fail in the browser as
 * "Failed to fetch dynamically imported module: <url>". TanStack Router reloads
 * once with `location.reload()`, which does not bypass a cached 404. These
 * helpers recheck that one script and allow a single further reload.
 */

const CHUNK_LOAD_PREFIXES = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
];

export const CHUNK_RECHECK_KEY = "xsalute-chunk-recheck:";

export function isChunkLoadMessage(message: string): boolean {
  return CHUNK_LOAD_PREFIXES.some((prefix) => message.startsWith(prefix));
}

/** A hashed /assets script on `origin`. Other URLs are not refetched. */
export function chunkUrlFromMessage(message: string, origin: string): string | null {
  const match = /https?:\/\/\S+/.exec(message);
  if (!match) return null;
  try {
    const url = new URL(match[0].replace(/[),.;]+$/, ""));
    if (url.origin !== origin) return null;
    if (!url.pathname.startsWith("/assets/") || !url.pathname.endsWith(".js")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function chunkRecheckKey(url: string): string {
  return CHUNK_RECHECK_KEY + url;
}

/** A fresh response is worth one reload. HTML, a 404, or a repeat is not. */
export function chunkResponseIsScript(status: number, contentType: string | null): boolean {
  return status === 200 && (contentType ?? "").toLowerCase().includes("javascript");
}
