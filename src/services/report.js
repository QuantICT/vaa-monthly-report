import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, beginSnapshot } from "../database/client.js";
import { getTenants, getSummary, getDetails } from "../database/repository.js";
import {
  createReport,
  addSummary,
  createDetailSheet,
  addDetails,
  finishReport,
  abortReport,
} from "../excel/workbook.js";

export async function generateReport(settings, period) {
  await mkdir(settings.outputDir, { recursive: true });
  const filename = path.join(
    settings.outputDir,
    `VAA_${period.label}_${randomUUID()}.xlsx`,
  );
  const temporary = filename + ".partial";
  const client = createClient(settings.database);
  let report;
  try {
    await client.connect();
    await beginSnapshot(client, settings.timeZone);
    const tenants = await getTenants(client);
    report = createReport(temporary);
    console.log(
      `Reporting period: ${period.start} <= disconnect time < ${period.end} (${settings.timeZone})`,
    );
    for (const [index, tenant] of tenants.entries()) {
      const summary = await getSummary(client, period, tenant.id);
      addSummary(report, tenant, summary);
      if (
        summary.causes.some((row) => ![0, 1, 2, 3].includes(Number(row.cause)))
      ) {
        console.warn(
          `Tenant ${index + 1}: additional end causes are included in the total and detail sheet only.`,
        );
      }
      const sheet = createDetailSheet(report, tenant);
      for await (const rows of getDetails(client, period, tenant.id))
        addDetails(sheet, rows);
      sheet.commit();
      console.log(`Processed tenant ${index + 1}/${tenants.length}.`);
    }
    await client.query("COMMIT");
    await finishReport(report);
    await rename(temporary, filename);
    return filename;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    abortReport(report);
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}
