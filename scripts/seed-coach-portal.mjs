/**
 * Link a sample pupil to an existing coach account.
 *
 *   COACH_SEED_EMAIL=you@example.com npm run seed:coach
 *
 * Requires DATABASE_URL. The email must already belong to a signed-up user.
 * Approves that user on the Coach Portal and links Mia Chen (a sample pupil).
 * Does not change the coach's own horses. No email is sent.
 *
 * With no database, use Add a sample pupil on /coach while signed in as an admin
 * (or the local dev user when auth is off).
 */
import pg from "pg";
import { seedCoachDemo } from "../src/lib/coach-portal.server.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const email = process.env.COACH_SEED_EMAIL?.trim().toLowerCase();

if (!databaseUrl) {
  console.log(
    "[seed:coach] DATABASE_URL is not set. Sign in as an admin and use Add a sample pupil on /coach.",
  );
  process.exit(0);
}
if (!email) {
  console.error("[seed:coach] Set COACH_SEED_EMAIL to the coach's account email.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
const sql = async (strings, ...values) => {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
  const result = await client.query(text, values);
  return result.rows;
};
sql.query = async (text, params = []) => (await client.query(text, params)).rows;

try {
  const users = await sql`select id, email from "user" where lower(email) = ${email}`;
  if (!users[0]) {
    console.error(`[seed:coach] No account for ${email}. They need to sign up first.`);
    process.exit(1);
  }
  const seeded = await seedCoachDemo(sql, users[0].id, { riderPreview: false });
  console.log(`[seed:coach] ${email} can open /coach and see ${seeded.pupilName} (${seeded.linkId}).`);
} finally {
  client.release();
  await pool.end();
}
