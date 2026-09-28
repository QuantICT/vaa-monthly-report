import pg from "pg";
export function createClient(settings) {
  return new pg.Client(settings);
}
export async function beginSnapshot(client, timeZone) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await client.query("SELECT set_config('TimeZone', $1, true)", [timeZone]);
}
