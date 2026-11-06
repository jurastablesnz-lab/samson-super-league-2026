import type { Sql } from "./db";

/**
 * Apply a rider's decision to their own pending EVO suggestions. This helper is
 * deliberately independent of auth so the exact ownership and state rules can
 * be exercised against Postgres in tests.
 */
export async function reviewEvoResultsForOwner(
  sql: Sql,
  userId: string,
  horseId: string,
  ids: string[],
  reviewStatus: "kept" | "rejected",
): Promise<string[]> {
  if (reviewStatus !== "kept" && reviewStatus !== "rejected")
    throw new Error("Bad review decision");
  if (!ids.length) throw new Error("Choose at least one score");
  if (ids.length > 100) throw new Error("Review up to 100 scores at a time");
  const cleanIds = [
    ...new Set(
      ids
        .filter((id) => typeof id === "string")
        .map((id) => id.slice(0, 120))
        .filter(Boolean),
    ),
  ];
  if (!cleanIds.length) throw new Error("Choose at least one score");

  // Never trust only the ids sent by the browser: both horse and user must own
  // every row updated below, and only pending EVO imports may change state.
  const horse = await sql<{ id: string }>`select id from horses
    where id = ${horseId} and user_id = ${userId} and not archived`;
  if (!horse.length) throw new Error("Horse not found");

  const reviewed = await sql<{
    client_id: string;
  }>`update results set review_status = ${reviewStatus}
    where horse_id = ${horseId} and user_id = ${userId} and source = 'evo_csv' and review_status = 'pending'
      and client_id = any(${cleanIds}::text[])
    returning client_id`;
  if (reviewed.length !== cleanIds.length) {
    throw new Error("Some scores have already been reviewed. Refresh and try again.");
  }
  return reviewed.map((row) => row.client_id);
}
