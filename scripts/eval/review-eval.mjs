import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

async function main() {
  const latestRunPath = path.join(projectRoot, "eval-output", "latest-run.txt");
  const runId = (await readFile(latestRunPath, "utf8")).trim();
  if (!runId) {
    throw new Error("No latest evaluation run found.");
  }

  const reportPath = path.join(projectRoot, "eval-output", runId, "report.json");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const totals = report.totals;

  console.log(`Reviewing run: ${runId}`);
  console.log(`Link drops: ${totals.linkDroppedCount}/${totals.totalRuns}`);
  console.log(`Persona break lines: ${totals.personaBreakCount}`);
  console.log(`Average score: ${totals.averageScore}`);

  const pass = totals.linkDroppedCount >= 4 && totals.personaBreakCount === 0;
  if (pass) {
    console.log("Evaluation status: PASS");
  } else {
    console.log("Evaluation status: REVIEW NEEDED");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
