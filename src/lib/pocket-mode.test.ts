import assert from "node:assert/strict";
import { test } from "node:test";
import {
  POCKET_HINT,
  POCKET_HOLD_MS,
  createScreenWakeLock,
  pocketHoldDone,
  pocketHoldMoved,
  pocketHoldProgress,
  startPocketHold,
} from "./pocket-mode.ts";

test("a hold unlocks at two seconds and a slide cancels it", () => {
  const hold = startPocketHold(1, 10, 20, 1_000);
  assert.equal(pocketHoldProgress(null, 1_500), 0);
  assert.equal(pocketHoldProgress(hold, 1_000), 0);
  assert.equal(pocketHoldProgress(hold, 2_000), 0.5);
  assert.equal(pocketHoldDone(hold, 1_000 + POCKET_HOLD_MS - 1), false);
  assert.equal(pocketHoldDone(hold, 1_000 + POCKET_HOLD_MS), true);
  assert.equal(pocketHoldMoved(hold, 20, 20), false);
  assert.equal(pocketHoldMoved(hold, 80, 20), true);
  assert.match(POCKET_HINT, /side button/);
});

test("the screen lock is asked for again after release and when the page returns", async () => {
  const sentinels: { release: () => Promise<void>; listeners: Array<() => void> }[] = [];
  const visibleListeners: Array<() => void> = [];
  let stopped = false;
  let visible = true;
  const requests: number[] = [];
  const released: number[] = [];
  const wake = createScreenWakeLock({
    isVisible: () => visible,
    request: async () => {
      requests.push(requests.length + 1);
      const sentinel = {
        listeners: [] as Array<() => void>,
        release: async () => {
          released.push(requests.length);
        },
        addEventListener: (_type: "release", listener: () => void) => {
          sentinel.listeners.push(listener);
        },
        removeEventListener: (_type: "release", listener: () => void) => {
          sentinel.listeners = sentinel.listeners.filter((item) => item !== listener);
        },
      };
      sentinels.push(sentinel);
      return sentinel;
    },
    onVisible: (listener) => {
      visibleListeners.push(listener);
      return () => {
        stopped = true;
      };
    },
  });
  await Promise.resolve();
  assert.equal(requests.length, 1);
  visible = false;
  sentinels[0]?.listeners[0]?.();
  await Promise.resolve();
  assert.equal(requests.length, 1);
  visible = true;
  visibleListeners[0]?.();
  await Promise.resolve();
  assert.equal(requests.length, 2);
  wake.release();
  await Promise.resolve();
  assert.equal(stopped, true);
  assert.equal(released.length, 1);
  visibleListeners[0]?.();
  sentinels[1]?.listeners[0]?.();
  await Promise.resolve();
  assert.equal(requests.length, 2);
});
