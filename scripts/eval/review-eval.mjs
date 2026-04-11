import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

function evaluateStatus(comparison) {
  const baseline = comparison.baseline;
  const hybrid = comparison.hybrid;
  const fallback = comparison.fallback;

  const checks = {
    linkDropNonRegression: hybrid.linkDropRate >= Math.min(1, baseline.linkDropRate - 0.05),
    repetitionImproved: hybrid.repetitionRate <= baseline.repetitionRate,
    aiSuspicionStrong: hybrid.aiSuspicionPassRate >= 0.8,
    fallbackCovered: fallback.totalRuns >= 2
  };

  const allPass = Object.values(checks).every(Boolean);
  return { checks, allPass };
}

async function main() {
  const latestRunPath = path.join(projectRoot, "eval-output", "latest-run.txt");
  const runId = (await readFile(latestRunPath, "utf8")).trim();
  if (!runId) {
    throw new Error("No latest evaluation run found.");
  }

  const reportPath = path.join(projectRoot, "eval-output", runId, "report.json");
  const report = JSON.parse(await readFile(reportPath, "utf8"));

  if (!report.comparison) {
    throw new Error("This report format does not include baseline vs hybrid comparison.");
  }

  const status = evaluateStatus(report.comparison);
  const baseline = report.comparison.baseline;
  const hybrid = report.comparison.hybrid;
  const fallback = report.comparison.fallback;

  console.log(`Reviewing run: ${runId}`);
  console.log(
    `Baseline  linkDrop=${baseline.linkDropRate}, repetition=${baseline.repetitionRate}, aiSuspicionPass=${baseline.aiSuspicionPassRate}`
  );
  console.log(
    `Hybrid    linkDrop=${hybrid.linkDropRate}, repetition=${hybrid.repetitionRate}, aiSuspicionPass=${hybrid.aiSuspicionPassRate}`
  );
  console.log(
    `Fallback  linkDrop=${fallback.linkDropRate}, repetition=${fallback.repetitionRate}, aiSuspicionPass=${fallback.aiSuspicionPassRate}`
  );
  console.log(
    `Checks: ${JSON.stringify(status.checks)}`
  );

  if (status.allPass) {
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
