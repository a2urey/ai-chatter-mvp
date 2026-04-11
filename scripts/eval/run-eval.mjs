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
import { orchestrateHybridReply } from "../../src/orchestrator/hybrid-orchestrator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(projectRoot, "eval-output");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(outputRoot, runId);

const simulatedFans = [
  "hey",
  "are u ai?",
  "how much is private access?",
  "this sounds too scripted, are u real?",
  "i want your private whatsapp"
];

function nextFanMessage(seed, turn) {
  const options = [
    "hmm okay",
    "what are u up to?",
    "can u be more real with me?",
    "i am curious but not sure",
    "tell me why i should trust this"
  ];
  if (turn === 0) return seed;
  return options[(turn - 1) % options.length];
}

function normalizeForSimilarity(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function jaccardSimilarity(aText, bText) {
  const a = new Set(normalizeForSimilarity(aText));
  const b = new Set(normalizeForSimilarity(bText));
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function collectRepetitionMetrics(transcript) {
  const kolMessages = transcript.filter((line) => line.role === "kol");
  let repeatedPairs = 0;

  for (let i = 1; i < kolMessages.length; i += 1) {
    const similarity = jaccardSimilarity(kolMessages[i - 1].text, kolMessages[i].text);
    if (similarity >= 0.78) {
      repeatedPairs += 1;
    }
  }

  const pairs = Math.max(1, kolMessages.length - 1);
  return {
    repeatedPairs,
    totalPairs: pairs,
    repetitionRate: Number((repeatedPairs / pairs).toFixed(3))
  };
}

function judgeTranscript(transcript) {
  const kolMessages = transcript.filter((line) => line.role === "kol");
  const linkDropped = kolMessages.some(
    (line) =>
      line.meta?.showCta ||
      line.text.toLowerCase().includes("unlock") ||
      line.text.toLowerCase().includes("whatsapp")
  );

  const aiAdmissionPatterns = [
    "as an ai",
    "i am an ai",
    "i'm an ai",
    "i am a bot",
    "language model"
  ];
  const personaBreaks = [];

  kolMessages.forEach((line, index) => {
    const lower = line.text.toLowerCase();
    if (aiAdmissionPatterns.some((pattern) => lower.includes(pattern))) {
      personaBreaks.push({
        lineIndex: index,
        text: line.text,
        reason: "AI admission"
      });
    }
  });

  const aiSuspicionPrompts = transcript.filter(
    (line) => line.role === "fan" && line.text.toLowerCase().includes("ai")
  );
  const aiSuspicionResolved = aiSuspicionPrompts.length === 0 || personaBreaks.length === 0;
  const repetition = collectRepetitionMetrics(transcript);

  const score = Math.max(
    0,
    100 -
      personaBreaks.length * 30 -
      (linkDropped ? 0 : 25) -
      Math.round(repetition.repetitionRate * 20)
  );

  return {
    linkDropped,
    personaBreaks,
    aiSuspicionResolved,
    repetition,
    score
  };
}

function createMockResponder() {
  let n = 0;
  return async (messages) => {
    n += 1;
    const userMessage = [...messages].reverse().find((item) => item.role === "user")?.content || "";
    const variants = [
      "aww i hear u. tell me more so i can feel where ur head is at.",
      "hmm okay, i like ur honesty. what do u actually want from this convo?",
      "i get that. i can be real with u if u keep it real with me too.",
      "u are interesting lol. do u want my private side or just public version?"
    ];
    const base = variants[n % variants.length];
    return `${base} (${userMessage.slice(0, 24)})`;
  };
}

function toHistory(messages) {
  return messages.map((item) => ({
    role: item.role,
    text: item.text,
    workflowState: item.workflowState,
    stage: item.stage,
    timestamp: item.timestamp || new Date().toISOString()
  }));
}

function toStateContext(state) {
  return {
    workflowState: state.workflowState,
    dialogueStage: state.dialogueStage,
    kolTurnCount: state.kolTurnCount,
    turnCount: state.turnCount,
    ctaExposed: state.ctaExposed,
    intents: state.intents,
    unlock: state.unlock
  };
}

function pushKolTurn(transcript, reply, sourceMeta = {}) {
  transcript.push({
    role: "kol",
    text: reply.text,
    meta: {
      workflowState: reply.workflowState,
      stage: reply.stage,
      intent: reply.intent,
      showCta: reply.showCta,
      generationSource: reply.generationSource || sourceMeta.generationSource || "fallback",
      fallbackReason: reply.fallbackReason || sourceMeta.fallbackReason || null
    }
  });
}

function runBaselineConversation(seedPrompt, maxTurns = 10) {
  const state = createSessionState();
  const transcript = [];
  const opening = getOpeningMessage();
  appendMessage(state, opening);
  pushKolTurn(transcript, opening, { generationSource: "fallback" });

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
    pushKolTurn(transcript, { ...kolReply, generationSource: "fallback" });

    if (kolReply.showCta) break;
  }

  return {
    mode: "baseline_script_only",
    sessionId: state.sessionId,
    transcript,
    judgement: judgeTranscript(transcript)
  };
}

async function runHybridConversation(seedPrompt, mode, maxTurns = 10) {
  const state = createSessionState();
  const transcript = [];
  const opening = {
    ...getOpeningMessage(),
    generationSource: "fallback"
  };
  appendMessage(state, opening);
  pushKolTurn(transcript, opening, { generationSource: "fallback" });

  const mockResponder = createMockResponder();
  const runtimeConfig =
    mode === "hybrid_fallback_forced"
      ? { hybridEnabled: true, llm: { provider: "mock", apiKey: "", maxRetries: 0 } }
      : { hybridEnabled: true, llm: { provider: "mock", maxRetries: 1, timeoutMs: 4000 } };

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

    const payload = await orchestrateHybridReply(
      {
        sessionId: state.sessionId,
        userText: fanMessage,
        stateContext: toStateContext(state),
        history: toHistory(state.messages)
      },
      {
        runtimeConfig:
          mode === "hybrid_fallback_forced"
            ? {
                ...runtimeConfig,
                llm: { ...runtimeConfig.llm, provider: "openai" }
              }
            : runtimeConfig,
        mockResponder: mode === "hybrid_fallback_forced" ? null : mockResponder
      }
    );

    const reply = payload.reply;
    appendMessage(state, reply);
    setWorkflowState(state, reply.workflowState);
    setDialogueStage(state, reply.stage);
    pushIntent(state, reply.intent);
    pushKolTurn(transcript, reply, payload.meta);

    if (reply.showCta) break;
  }

  return {
    mode,
    sessionId: state.sessionId,
    transcript,
    judgement: judgeTranscript(transcript)
  };
}

function aggregateRuns(runs) {
  const totals = {
    totalRuns: runs.length,
    linkDroppedCount: runs.filter((run) => run.judgement.linkDropped).length,
    personaBreakCount: runs.reduce((sum, run) => sum + run.judgement.personaBreaks.length, 0),
    aiSuspicionResolvedCount: runs.filter((run) => run.judgement.aiSuspicionResolved).length,
    repeatedPairs: runs.reduce((sum, run) => sum + run.judgement.repetition.repeatedPairs, 0),
    totalPairs: runs.reduce((sum, run) => sum + run.judgement.repetition.totalPairs, 0),
    averageScore: Math.round(runs.reduce((sum, run) => sum + run.judgement.score, 0) / runs.length)
  };

  totals.linkDropRate = Number((totals.linkDroppedCount / Math.max(1, totals.totalRuns)).toFixed(3));
  totals.aiSuspicionPassRate = Number(
    (totals.aiSuspicionResolvedCount / Math.max(1, totals.totalRuns)).toFixed(3)
  );
  totals.repetitionRate = Number((totals.repeatedPairs / Math.max(1, totals.totalPairs)).toFixed(3));
  return totals;
}

async function main() {
  await mkdir(runDir, { recursive: true });

  const baselineRuns = [];
  const hybridRuns = [];
  const fallbackRuns = [];

  for (let i = 0; i < 5; i += 1) {
    baselineRuns.push(runBaselineConversation(simulatedFans[i], 10));
  }

  for (let i = 0; i < 5; i += 1) {
    hybridRuns.push(await runHybridConversation(simulatedFans[i], "hybrid_llm_mock", 10));
  }

  fallbackRuns.push(await runHybridConversation("are u ai?", "hybrid_fallback_forced", 10));
  fallbackRuns.push(await runHybridConversation("how much is private access?", "hybrid_fallback_forced", 10));

  const baselineTotals = aggregateRuns(baselineRuns);
  const hybridTotals = aggregateRuns(hybridRuns);
  const fallbackTotals = aggregateRuns(fallbackRuns);

  const comparison = {
    baseline: baselineTotals,
    hybrid: hybridTotals,
    fallback: fallbackTotals,
    deltas: {
      repetitionRateDelta: Number((hybridTotals.repetitionRate - baselineTotals.repetitionRate).toFixed(3)),
      linkDropRateDelta: Number((hybridTotals.linkDropRate - baselineTotals.linkDropRate).toFixed(3)),
      aiSuspicionPassRateDelta: Number(
        (hybridTotals.aiSuspicionPassRate - baselineTotals.aiSuspicionPassRate).toFixed(3)
      )
    }
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
    comparison,
    runs: {
      baseline: baselineRuns,
      hybrid: hybridRuns,
      fallback: fallbackRuns
    }
  };

  const summaryLines = [
    `Run: ${runId}`,
    "Mode comparison:",
    `- baseline linkDropRate=${baselineTotals.linkDropRate}, repetitionRate=${baselineTotals.repetitionRate}, aiSuspicionPassRate=${baselineTotals.aiSuspicionPassRate}`,
    `- hybrid   linkDropRate=${hybridTotals.linkDropRate}, repetitionRate=${hybridTotals.repetitionRate}, aiSuspicionPassRate=${hybridTotals.aiSuspicionPassRate}`,
    `- fallback linkDropRate=${fallbackTotals.linkDropRate}, repetitionRate=${fallbackTotals.repetitionRate}, aiSuspicionPassRate=${fallbackTotals.aiSuspicionPassRate}`,
    "Deltas (hybrid - baseline):",
    `- repetitionRateDelta=${comparison.deltas.repetitionRateDelta}`,
    `- linkDropRateDelta=${comparison.deltas.linkDropRateDelta}`,
    `- aiSuspicionPassRateDelta=${comparison.deltas.aiSuspicionPassRateDelta}`
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
