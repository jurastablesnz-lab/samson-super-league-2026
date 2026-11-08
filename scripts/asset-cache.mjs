/**
 * Hashed files under /assets are safe to cache, but a missing one must not be.
 * Vercel applies a route header to every /assets request, including the HTML
 * 404 the app shell returns when a chunk is gone. A year-long max-age then
 * pins that failure in the browser. Revalidate instead.
 */
export const ASSET_CACHE_CONTROL = "public, max-age=0, must-revalidate";

export function assetCacheIsReusableFailure(header) {
  return /max-age=31536000|immutable/i.test(header ?? "");
}
