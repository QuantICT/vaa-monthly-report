import ExcelJS from "exceljs";
import {
  uniqueSheetName,
  numeric,
  textValue,
  causeLabels,
  callerNumber,
  brusselsExcelDate,
  excelDuration,
} from "./values.js";
const detailColumns = [
  ["id", "Session ID", 38],
  ["caller", "Caller", 22],
  ["called", "Called", 22],
  ["tenantid", "Tenant ID", 38],
  ["tenantname", "Tenant name", 28],
  ["treeid", "Tree ID", 38],
  ["treename", "Tree name", 28],
  ["start", "Start (Europe/Brussels)", 25, "dd/mm/yyyy hh:mm"],
  ["duration", "Duration", 18, "[hh]:mm:ss"],
  ["blockread", "Blocks read", 16],
  ["cause", "End cause", 14],
  ["causeLabel", "End cause description", 28],
  ["transferredto", "Transferred to", 22],
  ["forwardednumber", "Forwarded number", 22],
  ["reinvitednumber", "Reinvited number", 22],
];
const numericKeys = new Set(["blockread", "cause"]);
function addSheet(report, name, columns) {
  const sheet = report.workbook.addWorksheet(
    uniqueSheetName(name, report.names),
    {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { defaultRowHeight: 19.5 },
    },
  );
  sheet.columns = columns.map(([key, header, width, numFmt]) => ({
    key,
    header,
    width,
    ...(numFmt ? { style: { numFmt } } : {}),
  }));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = {
      name: "Aptos",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F75FE" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  header.commit();
  sheet.reportRowCount = 1;
  return sheet;
}
function addRow(sheet, values) {
  if (sheet.reportRowCount >= 1048576)
    throw new Error("A worksheet exceeds the Excel row limit.");
  const row = sheet.addRow(values);
  sheet.reportRowCount++;
  row.font = { name: "Aptos", size: 11 };
  row.commit();
}
export function createReport(filename) {
  const report = {
    workbook: new ExcelJS.stream.xlsx.WorkbookWriter({
      filename,
      useStyles: true,
      useSharedStrings: false,
    }),
    names: new Set(),
  };
  report.summary = addSheet(report, "Totalen", [
    ["name", "Tenant name", 32],
    ["transferred", "Transferred", 20],
    ["caller", "Released by caller", 24],
    ["vaa", "Released by VAA", 24],
    ["licenses", "Not enough licenses", 26],
    ["total", "Total calls", 20],
  ]);
  return report;
}
export function addSummary(report, tenant, summary) {
  const causes = new Map(
    summary.causes.map((row) => [
      Number(row.cause),
      numeric(row.total_per_cause),
    ]),
  );
  addRow(report.summary, [
    textValue(tenant.name),
    causes.get(0) || 0,
    causes.get(2) || 0,
    causes.get(1) || 0,
    causes.get(3) || 0,
    numeric(summary.total),
  ]);
}
export function createDetailSheet(report, tenant) {
  return addSheet(report, tenant.name, detailColumns);
}
export function addDetails(sheet, rows) {
  for (const source of rows) {
    addRow(
      sheet,
      detailColumns.map(([key]) =>
        key === "causeLabel"
          ? causeLabels.get(Number(source.cause)) || `Other (${source.cause})`
          : key === "caller"
            ? callerNumber(source[key])
            : key === "start"
              ? brusselsExcelDate(source[key])
              : key === "duration"
                ? excelDuration(source[key])
                : numericKeys.has(key)
                  ? numeric(source[key])
                  : textValue(source[key]),
      ),
    );
  }
}
export async function finishReport(report) {
  report.summary.commit();
  await report.workbook.commit();
}
export function abortReport(report) {
  report?.workbook.zip.abort();
  report?.workbook.stream.destroy();
}
