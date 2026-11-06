import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { COMPETITION_LEVELS } from "./beta";
import type { AdminRider } from "./admin-riders";

export type PreparedHorseInput = {
  name: string;
  esnzNumber?: string;
  level: string;
  tests: string[];
};
export type PrepareRiderInput = { fullName: string; email: string; horses: PreparedHorseInput[] };

function validate(input: PrepareRiderInput): PrepareRiderInput {
  if (!input || typeof input !== "object") throw new Error("Enter the rider's details");
  const fullName = String(input.fullName ?? "")
    .trim()
    .slice(0, 120);
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  if (!fullName) throw new Error("Enter the rider's full name");
  const horses = (Array.isArray(input.horses) ? input.horses : [])
    .slice(0, 6)
    .map((h): PreparedHorseInput => ({
      name: String(h?.name ?? "")
        .trim()
        .slice(0, 80),
      esnzNumber: String(h?.esnzNumber ?? "")
        .trim()
        .slice(0, 20),
      level: String(h?.level ?? ""),
      tests: (Array.isArray(h?.tests) ? h.tests : [])
        .map((t) => String(t).trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 12),
    }))
    .filter((h) => h.name || h.esnzNumber);
  if ((Array.isArray(input.horses) ? input.horses : []).length > 6)
    throw new Error("Up to 6 horses");
  if (horses.some((h) => !h.name)) throw new Error("Every horse needs a name");
  if (horses.some((h) => !h.level)) throw new Error("Choose a level for each horse");
  if (horses.some((h) => h.esnzNumber && !/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(h.esnzNumber)))
    throw new Error("ESNZ numbers can only use letters, numbers, spaces and dashes");
  if (horses.some((h) => h.level && !(COMPETITION_LEVELS as readonly string[]).includes(h.level)))
    throw new Error("Choose a level for each horse");
  return { fullName, email, horses };
}

export const getAdminRiders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminRider[]> => {
    const { requireAdminUser } = await import("./rider.server");
    await requireAdminUser(context.userId);
    const { getSql } = await import("./db");
    const { loadAdminRiders } = await import("./admin-riders");
    return loadAdminRiders(await getSql());
  });

export const prepareRider = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(validate)
  .handler(async ({ context, data }) => {
    const { requireAdminUser } = await import("./rider.server");
    const admin = await requireAdminUser(context.userId);
    const { getSql } = await import("./db");
    const sql = await getSql();
    const { prepareRiderWorkspace } = await import("./rider-invites.server");
    const { generatePlan, sanitisePlanConfig } = await import("./plan-builder");
    const prepared = data.horses.map((horse) => {
      const config = sanitisePlanConfig(
        { horseName: horse.name, level: horse.level, tests: horse.tests, shows: [], goals: [] },
        { horseName: horse.name, level: horse.level },
      );
      return {
        name: horse.name,
        level: horse.level,
        esnzNumber: horse.esnzNumber || null,
        config,
        plan: generatePlan(config),
      };
    });
    await prepareRiderWorkspace(sql, {
      email: data.email,
      fullName: data.fullName,
      createdBy: admin.email ?? admin.id,
      horses: prepared,
      applicationHorses: data.horses.map((horse) => ({
        name: horse.name,
        level: horse.level,
        esnzNumber: horse.esnzNumber,
        notes: "",
      })),
    });
    return { ok: true as const, email: data.email };
  });
