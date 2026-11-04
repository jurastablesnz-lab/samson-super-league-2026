import { useCallback, useEffect, useState } from "react";
import { getBetaAccess, type BetaAccess } from "./beta";
import { useCurrentUserState } from "./auth/use-current-user";

export type BetaAccessState =
  | { state: "loading" }
  | { state: "signed_out" }
  | { state: "error"; message: string }
  | { state: "ready"; access: BetaAccess };

export function useBetaAccess(): BetaAccessState & { reload: () => void } {
  const { user, isPending } = useCurrentUserState();
  const [result, setResult] = useState<BetaAccessState>({ state: "loading" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const userId = user?.id ?? null;
  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setResult({ state: "signed_out" });
      return;
    }
    let cancelled = false;
    getBetaAccess()
      .then((access) => !cancelled && setResult({ state: "ready", access }))
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setResult(message === "Unauthorized" ? { state: "signed_out" } : { state: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, userId, tick]);
  return { ...result, reload };
}
