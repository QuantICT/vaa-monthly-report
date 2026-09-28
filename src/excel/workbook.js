export const causeLabels = new Map([
  [0, "Transferred"],
  [1, "Released by VAA"],
  [2, "Released by caller"],
  [3, "Not enough licenses"],
  [4, "Unknown"],
]);
export function numeric(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
    throw new Error("A numeric report value exceeds the supported range.");
  }
  return number;
}
export function uniqueSheetName(value, used) {
  const base =
    String(value ?? "Tenant")
      .replace(/[\\/?:*\[\]\x00-\x1f]/g, "_")
      .replace(/^'+|'+$/g, "")
      .trim() || "Tenant";
  let name = base.slice(0, 31),
    n = 2;
  while (used.has(name.toLowerCase()) || name.toLowerCase() === "history") {
    const suffix = ` (${n++})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}
export function textValue(value) {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (text.length > 32767)
    throw new Error(
      "A text value exceeds the Excel cell limit of 32767 characters.",
    );
  return text;
}

const brusselsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Brussels",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function callerNumber(value) {
  return textValue(value)
    .trim()
    .replace(/^sips?:/i, "")
    .split("@", 1)[0];
}

export function brusselsExcelDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const instant = new Date(numeric(value) * 1000);
  if (Number.isNaN(instant.getTime()))
    throw new Error("Invalid call start timestamp.");
  const parts = Object.fromEntries(
    brusselsFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  // Excel stores a timezone-free wall-clock date. Encode Brussels components as UTC
  // to prevent ExcelJS from applying the exporting machine's local timezone.
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
}

export function excelDuration(value) {
  if (value === null || value === undefined || value === "") return null;
  const seconds = numeric(value);
  if (seconds < 0) throw new Error("Call duration cannot be negative.");
  return Math.round(seconds) / 86400;
}
