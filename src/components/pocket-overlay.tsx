import { useEffect, useRef, useState } from "react";
import {
  pocketHoldDone,
  pocketHoldMoved,
  pocketHoldProgress,
  startPocketHold,
  type PocketHold,
} from "@/lib/pocket-mode";

/** Dark cover. It does not touch the microphone or the voice clips. */
export function PocketOverlay({ movement, onUnlock }: { movement: string; onUnlock: () => void }) {
  const holdRef = useRef<PocketHold | null>(null);
  const [hold, setHold] = useState<PocketHold | null>(null);
  const [now, setNow] = useState(0);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previous = {
      rootOverscroll: root.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      rootTouch: root.style.touchAction,
    };
    root.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    root.style.touchAction = "none";
    return () => {
      root.style.overscrollBehavior = previous.rootOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      root.style.touchAction = previous.rootTouch;
    };
  }, []);

  useEffect(() => {
    if (!hold) return;
    let frame = 0;
    const tick = () => {
      const current = holdRef.current;
      if (!current) return;
      const time = Date.now();
      setNow(time);
      if (pocketHoldDone(current, time)) {
        holdRef.current = null;
        setHold(null);
        onUnlockRef.current();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [hold]);

  const progress = pocketHoldProgress(hold, now);
  const ring = 2 * Math.PI * 28;

  return (
    <div
      className="fixed inset-0 z-[80] flex touch-none flex-col items-center justify-between bg-black px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-white select-none"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      role="dialog"
      aria-label="Pocket mode. Hold for two seconds to unlock."
      data-testid="pocket-mode"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const next = startPocketHold(event.pointerId, event.clientX, event.clientY, Date.now());
        holdRef.current = next;
        setHold(next);
        setNow(next.startedAt);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = holdRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (pocketHoldMoved(current, event.clientX, event.clientY)) {
          holdRef.current = null;
          setHold(null);
        }
      }}
      onPointerUp={(event) => {
        const current = holdRef.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const done = pocketHoldDone(current, Date.now());
        holdRef.current = null;
        setHold(null);
        if (done) onUnlockRef.current();
      }}
      onTouchMove={(event) => event.preventDefault()}
      onPointerCancel={() => {
        holdRef.current = null;
        setHold(null);
      }}
    >
      <p className="text-center text-sm text-white/45">Pocket mode, hold 2s to unlock</p>
      <p className="max-w-sm text-center font-display text-4xl leading-tight text-white/30">{movement}</p>
      <div className="relative grid size-20 place-items-center" aria-hidden="true">
        <svg className="size-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={ring}
            strokeDashoffset={ring * (1 - progress)}
          />
        </svg>
        <span className="absolute text-xs text-white/50">{progress > 0 ? "Hold" : ""}</span>
      </div>
    </div>
  );
}
