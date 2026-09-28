import { loadSettings } from "./config/settings.js";
import { getPeriod } from "./utils/period.js";
import { parseArguments, showHelp, reportError } from "./utils/cli.js";
import { generateReport } from "./services/report.js";

try {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    showHelp();
  } else {
    const settings = loadSettings();
    const period = getPeriod(args.month, settings.timeZone);
    const filename = await generateReport(settings, period);
    console.log(`Report saved: ${filename}`);
  }
} catch (error) {
  reportError(error);
}
