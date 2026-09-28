export function parseArguments(args) {
  if (args.length === 1 && ["--help", "-h"].includes(args[0]))
    return { help: true };
  if (!args.length) return {};
  if (args.length === 2 && args[0] === "--month") return { month: args[1] };
  throw new Error("Usage: npm start -- [--month YYYY-MM]");
}
export function showHelp() {
  console.log(
    "Usage: npm start -- [--month YYYY-MM]\nDefault: previous calendar month in REPORT_TIMEZONE.",
  );
}
export function reportError(error) {
  // Avoid printing database errors that may contain call data or credentials.
  console.error(`Report failed (${error.code || error.name || "Error"}).`);
  if (!error.code) console.error(error.message);
  process.exitCode = 1;
}
