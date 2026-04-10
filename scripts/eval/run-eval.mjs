import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { campaignConfig } from "../../src/config/campaign.js";
import {
  appendMessage,
  createSessionState,
  pushIntent,
  setDialogueStage,
  setWorkflowState
} from "../../src/state/session.js";
import { buildKolReply, getOpeningMessage } from "../../src/dialogue/engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(projectRoot, "eval-output");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(outputRoot, runId);

const simulatedFans = [
  "I am curious but I do not trust online coaches.",
  "How much does your private access usually cost?",
  "I am mentally exhausted and overthinking every decision.",
  "This sounds salesy. Why should I believe this works?",
  "If I unlock, what exactly do I get from you?"
];

function nextFanMessage(seed, turn) {
  const options = [
    "I still feel unsure.",
    "Can you be more concrete?",
    "What if I panic and stop replying?",
    "Is this really private?",
    "Will you reply fast?"
  ];
  if (turn === 0) return seed;
  return options[(turn - 1) % options.length];
}

function judgeTranscript(transcript) {
  const kolMessages = transcript.filter((line) => line.role === "kol");
  const linkDropped = kolMessages.some(
    (line) =>
      line.meta?.showCta ||
      line.text.includes("unlock") ||
      line.text.includes("WhatsApp") ||
      line.text.includes("whatsapp")
  );

  const forbiddenSignals = [
    "as an ai",
    "language model",
    "vote",
    "election",
    "political party"
  ];
  const personaBreaks = [];

  kolMessages.forEach((line, index) => {
    const lower = line.text.toLowerCase();
    if (forbiddenSignals.some((signal) => lower.includes(signal))) {
      personaBreaks.push({
        lineIndex: index,
        text: line.text,
        reason: "Contains forbidden phrase"
      });
    }
  });

  const score = Math.max(0, 100 - personaBreaks.length * 30 - (linkDropped ? 0 : 35));
  return {
    linkDropped,
    personaBreaks,
    score
  };
}

function createConversation(seedPrompt, maxTurns = 10) {
  const state = createSessionState();
  const transcript = [];

  const opening = getOpeningMessage();
  appendMessage(state, opening);
  transcript.push({
    role: "kol",
    text: opening.text,
    meta: {
      workflowState: opening.workflowState,
      stage: opening.stage,
      showCta: opening.showCta
    }
  });

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const fanMessage = nextFanMessage(seedPrompt, turn);
    const userMessage = {
      role: "user",
      text: fanMessage,
      workflowState: state.workflowState,
      stage: state.dialogueStage
    };
    appendMessage(state, userMessage);
    transcript.push({
      role: "fan",
      text: fanMessage
    });

    const kolReply = buildKolReply({
      userText: fanMessage,
      state
    });
    appendMessage(state, kolReply);
    setWorkflowState(state, kolReply.workflowState);
    setDialogueStage(state, kolReply.stage);
    pushIntent(state, kolReply.intent);
    transcript.push({
      role: "kol",
      text: kolReply.text,
      meta: {
        workflowState: kolReply.workflowState,
        stage: kolReply.stage,
        intent: kolReply.intent,
        showCta: kolReply.showCta
      }
    });

    if (kolReply.showCta) {
      break;
    }
  }

  const judgement = judgeTranscript(transcript);
  return {
    sessionId: state.sessionId,
    transcript,
    judgement
  };
}

async function main() {
  await mkdir(runDir, { recursive: true });
  const runs = [];
  for (let i = 0; i < 5; i += 1) {
    const run = createConversation(simulatedFans[i], 10);
    runs.push(run);
  }

  const totals = {
    totalRuns: runs.length,
    linkDroppedCount: runs.filter((run) => run.judgement.linkDropped).length,
    personaBreakCount: runs.reduce((sum, run) => sum + run.judgement.personaBreaks.length, 0),
    averageScore: Math.round(runs.reduce((sum, run) => sum + run.judgement.score, 0) / runs.length)
  };

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    campaignId: campaignConfig.campaignId,
    configSnapshot: {
      systemPrompt: campaignConfig.prompt.systemPrompt,
      forbiddenBehaviors: campaignConfig.prompt.forbiddenBehaviors,
      fewShotExamples: campaignConfig.prompt.fewShotExamples
    },
    totals,
    runs
  };

  const summaryLines = [
    `Run: ${runId}`,
    `Total runs: ${totals.totalRuns}`,
    `Successful link drops: ${totals.linkDroppedCount}`,
    `Persona break lines: ${totals.personaBreakCount}`,
    `Average score: ${totals.averageScore}`,
    "",
    "Per run:",
    ...runs.map(
      (run, index) =>
        `- #${index + 1} score=${run.judgement.score}, linkDropped=${run.judgement.linkDropped}, personaBreaks=${run.judgement.personaBreaks.length}`
    )
  ].join("\n");

  await writeFile(path.join(runDir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(runDir, "summary.txt"), summaryLines);
  await writeFile(path.join(outputRoot, "latest-run.txt"), `${runId}\n`);

  console.log(summaryLines);
  console.log(`Saved transcripts and report to ${runDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
