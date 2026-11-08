/**
 * A request only reaches the server when the file is not in the static output.
 * Missing chunks must be a short-lived 404, not the app HTML shell. The shell
 * makes the browser report "Failed to fetch dynamically imported module".
 */
interface AssetEvent {
  url: URL;
}

export default function assetMiss(event: AssetEvent, next: () => unknown): unknown {
  const path = event.url.pathname;
  if (!path.startsWith("/assets/")) return next();
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
