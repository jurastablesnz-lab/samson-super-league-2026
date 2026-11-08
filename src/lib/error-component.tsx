import { useEffect, useState } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import {
  chunkRecheckKey,
  chunkResponseIsScript,
  chunkUrlFromMessage,
  isChunkLoadMessage,
} from "@/lib/chunk-load";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

function readKey(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode can refuse sessionStorage. The button still reloads once.
  }
}

/** Bypass a cached 404 for this script. Does not touch saved scores or videos. */
async function scriptIsAvailable(url: string): Promise<boolean> {
  const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
  return chunkResponseIsScript(response.status, response.headers.get("content-type"));
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const message = errorMessage(error);
  const chunkUrl =
    typeof location === "undefined" || !isChunkLoadMessage(message)
      ? null
      : chunkUrlFromMessage(message, location.origin);
  const [notice, setNotice] = useState<string | null>(chunkUrl ? "Checking the page file…" : null);

  useEffect(() => {
    if (!chunkUrl) return;
    const key = chunkRecheckKey(chunkUrl);
    let cancel = false;
    void (async () => {
      let fresh = false;
      try {
        fresh = await scriptIsAvailable(chunkUrl);
      } catch {
        fresh = false;
      }
      if (cancel) return;
      if (fresh && readKey(key) !== "1") {
        writeKey(key, "1");
        window.location.reload();
        return;
      }
      setNotice(
        fresh
          ? "The page file is available again. Show the page to continue."
          : "The page file is still missing. Try again, or hard-reload this tab.",
      );
    })();
    return () => {
      cancel = true;
    };
  }, [chunkUrl]);

  async function retry() {
    if (!chunkUrl) {
      window.location.reload();
      return;
    }
    setNotice("Checking the page file…");
    try {
      const fresh = await scriptIsAvailable(chunkUrl);
      if (!fresh) {
        setNotice(
          "The page file is still missing. Hard-reload this tab without clearing site data.",
        );
        return;
      }
    } catch {
      setNotice(
        "The page file could not be checked. Hard-reload this tab without clearing site data.",
      );
      return;
    }
    writeKey(chunkRecheckKey(chunkUrl), "1");
    window.location.reload();
  }

  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">{message}</p>
      {isChunkLoadMessage(message) && (
        <>
          {notice && <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">{notice}</p>}
          <button
            type="button"
            onClick={() => void retry()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Show the page
          </button>
          <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
            This reloads the tab once. Scores, notes, and videos saved on this device stay put. A
            hard reload is Shift plus the reload button. Do not clear site data.
          </p>
        </>
      )}
    </main>
  );
}
