import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import type { Sql } from "./db.ts";

export function asSql(pg: PGlite): Sql {
  const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return (await pg.query<T>(text, values)).rows;
  }) as Sql;
  sql.query = async <T>(text: string, params: unknown[] = []) =>
    (await pg.query<T>(text, params)).rows;
  return sql;
}
export async function database(): Promise<PGlite> {
  const pg = new PGlite();
  await pg.waitReady;
  const files = (await readdir(new URL("../../migrations", import.meta.url)))
    .filter((name) => /\.sql$/.test(name))
    .sort();
  for (const name of files)
    await pg.exec(await readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8"));
  return pg;
}
