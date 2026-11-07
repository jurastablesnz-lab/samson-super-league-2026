/**
 * Admin: load the shipped beta results in one tap.
 * Matching and the review-safe dedupe live in seed-results.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import type { SeedImportReport } from "./seed-results";

export const loadBetaResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SeedImportReport> => {
    const { getSql } = await import("./db");
    const { requireAdminUser } = await import("./rider.server");
    const { importShippedSeedResults } = await import("./seed-results.server");
    const sql = await getSql();
    const admin = await requireAdminUser(context.userId, sql);
    return importShippedSeedResults(sql, admin.email ?? admin.id);
  });
