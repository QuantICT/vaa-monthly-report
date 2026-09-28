export function getPeriod(month, timeZone, now = new Date()) {
  let year, number;
  if (month !== undefined) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new Error("Month must use YYYY-MM format.");
    [year, number] = month.split("-").map(Number);
    if (year < 1900 || year > 9998)
      throw new Error("Year must be between 1900 and 9998.");
  } else {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    year = Number(parts.find((p) => p.type === "year").value);
    number = Number(parts.find((p) => p.type === "month").value) - 1;
    if (number === 0) {
      number = 12;
      year--;
    }
  }
  const label = `${year}-${String(number).padStart(2, "0")}`;
  const next =
    number === 12
      ? `${year + 1}-01`
      : `${year}-${String(number + 1).padStart(2, "0")}`;
  return { label, start: `${label}-01 00:00:00`, end: `${next}-01 00:00:00` };
}
