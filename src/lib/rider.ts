/**
 * Server functions for the per-rider workspace (Postgres). Every handler runs
 * behind authMiddleware and passes the verified user id to rider.server.ts,
 * which scopes every query to that user.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import type { EvoRow } from "./evo-csv";
import type {
  EvoImportResult,
  HorseLog,
  LegacySnapshot,
  NoteRecord,
  Progress,
  ResultRecord,
  SetupHorseInput,
  SheetRecord,
  Workspace,
} from "./rider-types";

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Workspace> => {
    const { loadWorkspace } = await import("./rider.server");
    return loadWorkspace(context.userId);
  });

export const saveSetup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horses: SetupHorseInput[]; archiveMissing?: boolean }) => {
    if (!input || !Array.isArray(input.horses)) throw new Error("Bad setup");
    return { horses: input.horses.slice(0, 6), archiveMissing: input.archiveMissing === true };
  })
  .handler(async ({ context, data }): Promise<Workspace> => {
    const { saveSetup: save } = await import("./rider.server");
    return save(context.userId, data.horses, !data.archiveMissing);
  });

export const getHorseLog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string }) => ({ horseId: str(input?.horseId) }))
  .handler(async ({ context, data }): Promise<HorseLog> => {
    const { loadHorseLog } = await import("./rider.server");
    return loadHorseLog(context.userId, data.horseId);
  });

export const saveResult = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; result: Partial<ResultRecord> }) => {
    const pct = Number(input?.result?.percent);
    if (input?.result?.percent != null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      throw new Error("Percent must be 0–100");
    }
    return { horseId: str(input?.horseId), result: input?.result ?? {} };
  })
  .handler(async ({ context, data }) => {
    const { requireAccess, ownedHorse, upsertResult, loadHorseLog } =
      await import("./rider.server");
    const { getSql } = await import("./db");
    await requireAccess(context.userId);
    const sql = await getSql();
    await ownedHorse(sql, context.userId, data.horseId);
    await upsertResult(sql, context.userId, data.horseId, data.result, "app");
    return loadHorseLog(context.userId, data.horseId);
  });

type Kind = "result" | "note" | "sheet";

export const deleteEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; kind: Kind; id: string }) => {
    if (!["result", "note", "sheet"].includes(input?.kind)) throw new Error("Bad kind");
    return { horseId: str(input.horseId), kind: input.kind, id: str(input.id, 200) };
  })
  .handler(async ({ context, data }) => {
    const { requireAccess, ownedHorse, loadHorseLog } = await import("./rider.server");
    const { getSql } = await import("./db");
    await requireAccess(context.userId);
    const sql = await getSql();
    await ownedHorse(sql, context.userId, data.horseId);
    const u = context.userId;
    if (data.kind === "result") {
      // CSV-imported results are the official record — riders can't delete them.
      await sql`delete from results where horse_id = ${data.horseId} and user_id = ${u} and client_id = ${data.id} and source <> 'evo_csv'`;
    } else if (data.kind === "note") {
      await sql`delete from ride_notes where horse_id = ${data.horseId} and user_id = ${u} and client_id = ${data.id}`;
    } else {
      await sql`delete from judge_sheets where horse_id = ${data.horseId} and user_id = ${u} and client_id = ${data.id}`;
    }
    return loadHorseLog(context.userId, data.horseId);
  });

export const saveNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; note: Partial<NoteRecord> }) => {
    if (!input?.note?.text?.trim()) throw new Error("Write something first");
    return { horseId: str(input.horseId), note: input.note };
  })
  .handler(async ({ context, data }) => {
    const { requireAccess, ownedHorse, upsertNote, loadHorseLog } = await import("./rider.server");
    const { getSql } = await import("./db");
    await requireAccess(context.userId);
    const sql = await getSql();
    await ownedHorse(sql, context.userId, data.horseId);
    await upsertNote(sql, context.userId, data.horseId, data.note);
    return loadHorseLog(context.userId, data.horseId);
  });

export const saveSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; sheet: Partial<SheetRecord> }) => {
    if (JSON.stringify(input?.sheet ?? {}).length > 200_000) throw new Error("Sheet too large");
    return { horseId: str(input?.horseId), sheet: input?.sheet ?? {} };
  })
  .handler(async ({ context, data }) => {
    const { requireAccess, ownedHorse, upsertSheet, loadHorseLog } = await import("./rider.server");
    const { getSql } = await import("./db");
    await requireAccess(context.userId);
    const sql = await getSql();
    await ownedHorse(sql, context.userId, data.horseId);
    await upsertSheet(sql, context.userId, data.horseId, data.sheet);
    return loadHorseLog(context.userId, data.horseId);
  });

export const saveProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; progress: Partial<Progress> }) => ({
    horseId: str(input?.horseId),
    progress: input?.progress ?? {},
  }))
  .handler(async ({ context, data }) => {
    const { setProgress } = await import("./rider.server");
    await setProgress(context.userId, data.horseId, data.progress);
    return { ok: true };
  });

const snapshotValidator = (input: { snapshot: LegacySnapshot; horseId?: string }) => {
  if (!input?.snapshot || typeof input.snapshot !== "object") throw new Error("Nothing to import");
  if (JSON.stringify(input.snapshot).length > 3_000_000) throw new Error("Snapshot too large");
  return { snapshot: input.snapshot, horseId: str(input.horseId) };
};

/** Owner only: current server copy of Samson's data (null until imported). */
export const getLegacyState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { ownerLegacyState } = await import("./rider.server");
    return ownerLegacyState(context.userId);
  });

/** Owner only: first import of this device's Samson data (add-only). */
export const importLegacy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(snapshotValidator)
  .handler(async ({ context, data }) => {
    const { ownerImportLegacy } = await import("./rider.server");
    return ownerImportLegacy(context.userId, data.snapshot);
  });

/** Owner only: keep the server copy in step with this device after import. */
export const syncLegacy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(snapshotValidator)
  .handler(async ({ context, data }) => {
    const { ownerSyncLegacy } = await import("./rider.server");
    return ownerSyncLegacy(context.userId, data.snapshot);
  });

/** Riders: import their own earlier-beta localStorage into one of their horses (add-only). */
export const importLocalForHorse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(snapshotValidator)
  .handler(async ({ context, data }) => {
    const { riderImportLocal } = await import("./rider.server");
    return riderImportLocal(context.userId, data.horseId, data.snapshot);
  });

/** Rider: turn their own pasted EVO scores into pending review suggestions. */
export const importOwnEvoResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; rows: EvoRow[] }) => {
    if (!Array.isArray(input?.rows)) throw new Error("No EVO scores to import");
    if (JSON.stringify(input.rows).length > 500_000)
      throw new Error("That paste is too large — import fewer rows at a time");
    return { horseId: str(input?.horseId), rows: input.rows };
  })
  .handler(async ({ context, data }) => {
    const { importOwnEvoResults: save } = await import("./rider.server");
    return save(context.userId, data.horseId, data.rows);
  });

/** Rider: keep the selected EVO suggestions on their own horse. */
export const keepEvoResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; ids: string[] }) => ({
    horseId: str(input?.horseId),
    ids: Array.isArray(input?.ids) ? input.ids.slice(0, 100).map((id) => str(id, 120)) : [],
  }))
  .handler(async ({ context, data }): Promise<HorseLog> => {
    const { reviewEvoResults } = await import("./rider.server");
    return reviewEvoResults(context.userId, data.horseId, data.ids, "kept");
  });

/** Rider: hide and never re-suggest the selected EVO scores on their own horse. */
export const rejectEvoResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string; ids: string[] }) => ({
    horseId: str(input?.horseId),
    ids: Array.isArray(input?.ids) ? input.ids.slice(0, 100).map((id) => str(id, 120)) : [],
  }))
  .handler(async ({ context, data }): Promise<HorseLog> => {
    const { reviewEvoResults } = await import("./rider.server");
    return reviewEvoResults(context.userId, data.horseId, data.ids, "rejected");
  });

/** Admin only: send matched EVO Events CSV rows to beta riders for review. */
export const importEvoResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fileName: string; rows: EvoRow[]; dryRun?: boolean }) => {
    if (!Array.isArray(input?.rows)) throw new Error("No rows");
    return {
      fileName: str(input.fileName, 200),
      rows: input.rows.slice(0, 5000),
      dryRun: input.dryRun !== false,
    };
  })
  .handler(async ({ context, data }): Promise<EvoImportResult> => {
    const { importEvoRows } = await import("./evo-import.server");
    return importEvoRows(context.userId, data.fileName, data.rows, data.dryRun);
  });
