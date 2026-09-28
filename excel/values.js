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
