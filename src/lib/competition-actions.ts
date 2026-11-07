/**
 * Server functions for the competitions catalog and training-towards targets.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import type { CompetitionInput, CompetitionRecord, TrainingBoard } from "./competitions";

const str = (v: unknown, max = 80) => (typeof v === "string" ? v.slice(0, max) : "");

export const getCompetitions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CompetitionRecord[]> => {
    const { getSql } = await import("./db");
    const { requireAccess } = await import("./rider.server");
    const { listCompetitions } = await import("./competitions.server");
    const sql = await getSql();
    await requireAccess(context.userId);
    return listCompetitions(sql);
  });

export const saveCompetition = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<CompetitionInput>) => input ?? {})
  .handler(async ({ context, data }): Promise<CompetitionRecord[]> => {
    const { getSql } = await import("./db");
    const { requireAdminUser } = await import("./rider.server");
    const { saveCompetition: save } = await import("./competitions.server");
    const sql = await getSql();
    await requireAdminUser(context.userId, sql);
    return save(sql, data);
  });

export const deleteCompetition = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: str(input?.id) }))
  .handler(async ({ context, data }): Promise<CompetitionRecord[]> => {
    const { getSql } = await import("./db");
    const { requireAdminUser } = await import("./rider.server");
    const { deleteCompetition: remove } = await import("./competitions.server");
    const sql = await getSql();
    await requireAdminUser(context.userId, sql);
    return remove(sql, data.id);
  });

export const getTrainingBoard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { horseId: string }) => ({ horseId: str(input?.horseId) }))
  .handler(async ({ context, data }): Promise<TrainingBoard> => {
    const { getSql } = await import("./db");
    const { requireAccess } = await import("./rider.server");
    const { trainingBoard } = await import("./competitions.server");
    const sql = await getSql();
    await requireAccess(context.userId);
    return trainingBoard(sql, context.userId, data.horseId);
  });

export const setTrainingTarget = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { horseId: string; competitionId: string; tests?: string[]; on: boolean }) => ({
      horseId: str(input?.horseId),
      competitionId: str(input?.competitionId),
      tests: Array.isArray(input?.tests) ? input.tests.slice(0, 12) : [],
      on: input?.on === true,
    }),
  )
  .handler(async ({ context, data }): Promise<TrainingBoard> => {
    const { getSql } = await import("./db");
    const { requireAccess } = await import("./rider.server");
    const { setTrainingTarget: set } = await import("./competitions.server");
    const sql = await getSql();
    await requireAccess(context.userId);
    return set(sql, context.userId, data.horseId, data.competitionId, data.tests, data.on);
  });
