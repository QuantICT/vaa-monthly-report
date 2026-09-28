import { TENANTS, TOTAL, CAUSES, DETAILS } from "./queries.js";
export async function getTenants(client) {
  return (await client.query(TENANTS)).rows;
}
export async function getSummary(client, period, tenantId) {
  const params = [period.start, period.end, tenantId];
  const total = (await client.query(TOTAL, params)).rows[0].total_records;
  const causes = (await client.query(CAUSES, params)).rows;
  return { total, causes };
}
export async function* getDetails(client, period, tenantId) {
  await client.query(`DECLARE report_details NO SCROLL CURSOR FOR ${DETAILS}`, [
    period.start,
    period.end,
    tenantId,
  ]);
  try {
    while (true) {
      const { rows } = await client.query(
        "FETCH FORWARD 2000 FROM report_details",
      );
      if (!rows.length) break;
      yield rows;
    }
  } finally {
    await client.query("CLOSE report_details");
  }
}
