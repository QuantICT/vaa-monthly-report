# VAA Monthly Call Report

## 1. Purpose

A Node.js command-line application that reads a PostgreSQL database and exports monthly VAA call statistics to one Excel workbook. The default period is the previous calendar month. Code, comments, column headings and documentation are in English; the requested first worksheet name is `Totalen`.

## 2. Architecture

- `src/index.js`: entry point; imports and calls functions only.
- `src/config/settings.js`: project-relative environment configuration and validation.
- `src/database/client.js`: PostgreSQL connection and read-only snapshot.
- `src/database/queries.js`: the four supplied SQL queries, parameterized.
- `src/database/repository.js`: tenant lookup, totals, causes and batched details.
- `src/excel/workbook.js`: streaming Excel export and formatting.
- `src/excel/values.js`: worksheet names, text and numeric conversion.
- `src/services/report.js`: report orchestration and cleanup.
- `src/utils/`: calendar period and command-line handling.
- `test/`: dependency-free tests for date boundaries and export helpers.

## 3. Workflow

1. Load `.env` from the project root. Existing environment variables take precedence.
2. Calculate the previous calendar month in `REPORT_TIMEZONE`, or use `--month`.
3. Connect and open one repeatable-read, read-only transaction.
4. Execute query 1 to retrieve tenants.
5. Execute queries 2 and 3 for each tenant and write its summary row.
6. Execute query 4 with a server cursor, fetching 2,000 rows per batch.
7. Write a detail worksheet per tenant, including tenants with no calls.
8. Commit, finish the workbook and rename the temporary file to its final name.

The output is `output/VAA_YYYY-MM_<uuid>.xlsx`. UUIDs prevent accidental overwrites. A failed run does not publish a finished report. Unexpected process termination can leave a `.partial` file, which may be deleted once that process has stopped.

## 4. Requirements

- Node.js 22 or newer and npm.
- Network access to the PostgreSQL server; target database version: PostgreSQL 17.7. The `psql` command-line client is not needed.
- A database account with CONNECT, schema USAGE and SELECT permissions on `tenant`, `callTicket`, `disconnectTicket`, `activityticket` and `tree`.
- Writable output directory and enough disk space for the export.

Queries use the unquoted identifiers supplied in the specification. PostgreSQL folds them to lowercase. If the actual database uses quoted mixed-case identifiers, adapt `src/database/queries.js`. Tables must be visible through the account's search path. Joins assume that session IDs and tree IDs identify the intended records, as in the supplied queries.

## 5. Installation

Extract the project and open its root directory:

```bash
npm install
cp .env.example .env
```

Edit `.env` with the database connection details. On Windows PowerShell, use `Copy-Item .env.example .env` instead. Do not commit `.env`; the root `.gitignore` excludes credentials, output files and dependencies.

## 6. Configuration

| Variable | Description | Default |
| --- | --- | --- |
| PGHOST | Database hostname or IP | Required |
| PGPORT | Database TCP port | 5432 |
| PGDATABASE | Database name | Required |
| PGUSER | Database username | Required |
| PGPASSWORD | Database password; quote values containing `#` | Required |
| PGSSLMODE | `disable` or `verify-full` | disable |
| PGSSLROOTCERT | Optional trusted CA PEM file | System trust store |
| REPORT_TIMEZONE | IANA timezone for month selection and database session | Europe/Brussels |
| OUTPUT_DIR | Absolute path or path relative to the project | output |
| STATEMENT_TIMEOUT_MS | Per-statement timeout in milliseconds | 300000 |

Use `verify-full` if TLS is required; certificate validation remains enabled. Relative CA file paths resolve from the project root.

**Timestamp interpretation:** the SQL retains `$1::timestamp` and `$2::timestamp`, matching the supplied queries. For `timestamp without time zone`, boundaries are wall-clock values and must match the time convention used in those columns. Set `REPORT_TIMEZONE=UTC` if such values represent UTC. For `timestamptz`, PostgreSQL uses the configured session timezone when comparing these boundaries. Confirm the column types and storage convention before production use.

The filter includes disconnect times at the start boundary and excludes the end boundary. Calls are selected by disconnect time, not by start time. For a September 2026 run, the default interval is August 1 at 00:00 through September 1 at 00:00, exclusive.

## 7. Excel Output

The `Totalen` sheet contains exactly the six requested columns:

| Column | Source |
| --- | --- |
| Tenant name | Query 1 |
| Transferred | Query 3, cause 0 |
| Released by caller | Query 3, cause 2 |
| Released by VAA | Query 3, cause 1 |
| Not enough licenses | Query 3, cause 3 |
| Total calls | Query 2, distinct session IDs |

Missing cause counts are zero. Cause 4 (NULL mapped to Unknown) and other unrecognized causes are included in total calls and details, but have no summary cause column. The app logs a warning when they occur.

**Counting semantics are preserved:** query 3 counts grouped session/cause combinations, while query 2 counts distinct sessions. A session with several causes may contribute to several cause counts. NULL and explicit cause 4 can also form separate groups before COALESCE. Therefore, the sum of the displayed cause columns is not guaranteed to equal total calls. Query 4 may produce multiple detail rows per session when joined records differ. `blockRead` retains the supplied join/count semantics and is not changed to a distinct count. A NULL cause retains the supplied zero-duration behavior.

Each tenant sheet contains all 17 query 4 fields plus a readable end-cause description. Start is preserved as numeric epoch seconds; duration is numeric seconds. For timestamp-without-time-zone columns, the supplied EXTRACT expression gives a nominal epoch value, not an independently timezone-normalized instant. Identifiers, phone numbers and correlator data are exported as text, preserving leading zeroes and `+` signs. Text is not interpreted as Excel formulas.

Sheets have blue headers, readable widths, frozen headers and filters. Tenant names are sanitized, shortened to Excel's 31-character limit and made unique without regard to case. A tenant named `Totalen` gets a suffix. The original tenant name remains in the report data. Empty tenants still receive a sheet with headers. Excel row and cell-length limits cause a clear failure instead of silently truncating records. Detail exports are streamed; tenant and cause lists remain in memory. Database joins and sorts can still require substantial server resources.

## 8. Logging and Troubleshooting

Progress goes to stdout; warnings and failures go to stderr. Passwords, connection strings and call rows are not logged. Database failures show their error code without a potentially sensitive server message. Exit status is 0 on success and 1 on failure.

- `28P01`: verify username/password and PostgreSQL authentication policy.
- `42501`: check SELECT and schema access permissions.
- `42P01` / `42703`: check table/column names and search path.
- `57014`: statement timeout; review query plans and indexes with the DBA, then adjust the timeout if appropriate.
- `ECONNREFUSED` / `ETIMEDOUT`: verify address, port, routing and firewall.
- Certificate failures: verify CA trust and the hostname in the server certificate.
- Different totals: review the counting semantics in section 7.

The app never changes database data or creates indexes. The snapshot remains open during extraction; schedule larger reports at a suitable time and review database load. Keep exported caller data in a directory accessible only to authorized users.

Validation performed during development covers month/year boundaries, timezone-dependent month selection, worksheet names, text preservation and numeric/cell limits. No live database credentials were provided, so the database queries and complete export must be tested against your environment.

## 9. Command Reference

```bash
# Previous calendar month
npm start

# Explicit calendar month
npm start -- --month 2026-08

# Usage
npm start -- --help

# Unit tests
npm test
```

Example monthly cron job, using absolute paths (adjust installation path and Node location):

```cron
0 6 1 * * /usr/bin/node /opt/nodejs/vaa-monthly-report/src/index.js >> /var/log/vaa-monthly-report.log 2>&1
```

The scheduler uses the server's timezone; the reporting month uses `REPORT_TIMEZONE`. Avoid overlapping runs for large datasets. Configure log rotation separately.

Implementation references: [node-postgres parameterized queries](https://node-postgres.com/features/queries), [ExcelJS](https://github.com/exceljs/exceljs).
