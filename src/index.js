import test from "node:test";
import assert from "node:assert/strict";
import { getPeriod } from "../src/utils/period.js";
import { uniqueSheetName, textValue, numeric } from "../src/excel/values.js";
import { parseArguments } from "../src/utils/cli.js";

test("previous month handles year boundaries", () => {
  assert.deepEqual(
    getPeriod(undefined, "Europe/Brussels", new Date("2026-01-15T00:00:00Z")),
    {
      label: "2025-12",
      start: "2025-12-01 00:00:00",
      end: "2026-01-01 00:00:00",
    },
  );
});
test("month selection uses the configured timezone", () => {
  assert.equal(
    getPeriod(undefined, "Europe/Brussels", new Date("2026-08-31T22:30:00Z"))
      .label,
    "2026-08",
  );
});
test("explicit leap month and invalid input", () => {
  assert.equal(getPeriod("2024-02", "UTC").end, "2024-03-01 00:00:00");
  assert.throws(() => getPeriod("2026-13", "UTC"));
  assert.throws(() => parseArguments(["--month"]));
});
test("worksheet names are valid and unique ignoring case", () => {
  const used = new Set(["totalen"]);
  for (const name of [
    "Totalen",
    "TOTALEN",
    "a/b:c?d*e[f]",
    "",
    "'name'",
    "History",
    "x".repeat(50),
    "x".repeat(50),
  ]) {
    const result = uniqueSheetName(name, used);
    assert.ok(result.length <= 31);
    assert.doesNotMatch(result, /[\\/?:*\[\]]/);
  }
  assert.equal(used.size, 9);
});
test("phone numbers and formula-looking strings remain text", () => {
  assert.equal(textValue("003212345678"), "003212345678");
  assert.equal(textValue("=1+1"), "=1+1");
  assert.equal(numeric("42"), 42);
  assert.throws(() => numeric("99999999999999999999"));
  assert.throws(() => textValue("x".repeat(32768)));
});
