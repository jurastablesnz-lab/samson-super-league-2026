/** How long a finger must stay still before pocket mode unlocks. */
export const POCKET_HOLD_MS = 2000;

/** Movement beyond this cancels the hold, so a sliding palm does not unlock. */
export const POCKET_HOLD_SLOP_PX = 28;

export const POCKET_HINT =
  "Pocket mode keeps the screen on but dark; don't press the side button to lock the phone or the caller will stop.";

export type PocketHold = {
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
};

export function startPocketHold(pointerId: number, x: number, y: number, now: number): PocketHold {
  return { pointerId, x, y, startedAt: now };
}

export function pocketHoldProgress(hold: PocketHold | null, now: number, holdMs = POCKET_HOLD_MS): number {
  if (!hold) return 0;
  return Math.min(1, Math.max(0, (now - hold.startedAt) / holdMs));
}

export function pocketHoldMoved(hold: PocketHold, x: number, y: number, slop = POCKET_HOLD_SLOP_PX): boolean {
  return Math.hypot(x - hold.x, y - hold.y) > slop;
}

export function pocketHoldDone(hold: PocketHold | null, now: number, holdMs = POCKET_HOLD_MS): boolean {
  return !!hold && now - hold.startedAt >= holdMs;
}

type WakeSentinel = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
  removeEventListener?: (type: "release", listener: () => void) => void;
};

/**
 * Keep the screen on while the caller is open. Ask again when the browser
 * releases the lock, and when the page becomes visible. Unsupported browsers
 * reject the request and are ignored.
 */
export function createScreenWakeLock(input: {
  request: () => Promise<WakeSentinel>;
  onVisible: (listener: () => void) => () => void;
  isVisible?: () => boolean;
}): { release: () => void } {
  let wanted = true;
  let current: WakeSentinel | null = null;
  const onRelease = () => {
    current = null;
    if (wanted && (input.isVisible?.() ?? true)) ask();
  };
  const ask = () => {
    if (!wanted) return;
    void Promise.resolve()
      .then(() => input.request())
      .then((sentinel) => {
        if (!wanted) {
          void sentinel.release().catch(() => undefined);
          return;
        }
        current = sentinel;
        sentinel.addEventListener?.("release", onRelease);
      })
      .catch(() => undefined);
  };
  const stopVisible = input.onVisible(() => {
    if (wanted && !current) ask();
  });
  ask();
  return {
    release() {
      wanted = false;
      stopVisible();
      const sentinel = current;
      current = null;
      if (sentinel) {
        sentinel.removeEventListener?.("release", onRelease);
        void sentinel.release().catch(() => undefined);
      }
    },
  };
}
