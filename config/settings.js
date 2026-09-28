import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
export function loadSettings(env = process.env) {
  dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });
  for (const key of ["PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"]) {
    if (!env[key]) throw new Error(`Missing environment variable: ${key}`);
  }
  const port = Number(env.PGPORT || 5432);
  const timeout = Number(env.STATEMENT_TIMEOUT_MS || 300000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PGPORT.");
  if (!Number.isSafeInteger(timeout) || timeout < 1)
    throw new Error("Invalid STATEMENT_TIMEOUT_MS.");
  const mode = env.PGSSLMODE || "disable";
  if (!["disable", "verify-full"].includes(mode))
    throw new Error("PGSSLMODE must be disable or verify-full.");
  const timeZone = env.REPORT_TIMEZONE || "Europe/Brussels";
  new Intl.DateTimeFormat("en", { timeZone }).format();
  return {
    database: {
      host: env.PGHOST,
      port,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      application_name: "vaa-monthly-report",
      connectionTimeoutMillis: 15000,
      statement_timeout: timeout,
      ssl:
        mode === "disable"
          ? false
          : {
              rejectUnauthorized: true,
              ...(env.PGSSLROOTCERT
                ? {
                    ca: readFileSync(
                      path.resolve(projectRoot, env.PGSSLROOTCERT),
                      "utf8",
                    ),
                  }
                : {}),
            },
    },
    timeZone,
    outputDir: path.resolve(projectRoot, env.OUTPUT_DIR || "output"),
  };
}
