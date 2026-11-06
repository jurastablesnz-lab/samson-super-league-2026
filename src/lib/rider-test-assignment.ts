import type { Sql } from "./db.ts";
import { generatePlan, sanitisePlanConfig, testsForLevel } from "./plan-builder.ts";

export type RiderTestAssignment = { horseId: string; test: string; action: "add" | "remove" };

export function validateRiderTestAssignment(input: RiderTestAssignment): RiderTestAssignment {
  if (!input || typeof input !== "object") throw new Error("Choose a horse and test");
  const horseId = String(input.horseId ?? "")
    .trim()
    .slice(0, 100);
  const test = String(input.test ?? "")
    .trim()
    .slice(0, 60);
  if (!horseId || !test) throw new Error("Choose a horse and test");
  if (input.action !== "add" && input.action !== "remove") throw new Error("Invalid test action");
  return { horseId, test, action: input.action };
}

/** Admin assignment only: test definitions/movements are never edited or stored here. */
export async function assignRiderTest(sql: Sql, input: RiderTestAssignment) {
  const { horseId, test, action } = validateRiderTestAssignment(input);
  const [horse] = await sql<{
    id: string;
    user_id: string;
    name: string;
    level: string;
    config: unknown;
  }>`select h.id, h.user_id, h.name, h.level, p.config from horses h join plans p on p.horse_id = h.id and p.user_id = h.user_id where h.id = ${horseId} and not h.archived`;
  if (!horse) throw new Error("Horse not found");
  const config = sanitisePlanConfig(horse.config, { horseName: horse.name, level: horse.level });
  if (!testsForLevel(horse.level).includes(test))
    throw new Error("Choose a test for this horse's level");
  const tests =
    action === "add"
      ? [...new Set([...config.tests, test])]
      : config.tests.filter((t) => t !== test);
  if (action === "remove" && config.tests.length === tests.length)
    throw new Error("Test is not assigned");
  config.tests = tests;
  const plan = generatePlan(config);
  await sql`update plans set config = ${JSON.stringify(config)}::jsonb, plan = ${JSON.stringify(plan)}::jsonb, updated_at = now() where horse_id = ${horse.id} and user_id = ${horse.user_id}`;
  return { horseId: horse.id, tests };
}
