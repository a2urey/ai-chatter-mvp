import { campaignConfig } from "../config/campaign.js";
import { classifyIntent } from "./intent.js";

const stageByWorkflow = {
  A: "rapport",
  B: "resonance",
  C: "conversion"
};

const warmIntentSet = new Set([
  "curiosity",
  "engaged",
  "trust",
  "emotional_need",
  "flirty",
  "affirmative",
  "pricing_interest",
  "high_intent"
]);

const conversionIntentSet = new Set(["high_intent", "pricing_interest", "affirmative"]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recentKolTexts(state, limit = 3) {
  return state.messages
    .filter((message) => message.role === "kol")
    .slice(-limit)
    .map((message) => normalizeText(message.text));
}

function pickVariant(variants, seed, disallowTexts = []) {
  if (!variants || variants.length === 0) {
    return "";
  }
  const len = variants.length;
  const start = Math.abs(seed) % len;
  const disallow = new Set(disallowTexts.filter(Boolean));

  for (let i = 0; i < len; i += 1) {
    const candidate = variants[(start + i) % len];
    if (!disallow.has(normalizeText(candidate))) {
      return candidate;
    }
  }

  return variants[start];
}

function countUserTurns(state) {
  return state.messages.filter((message) => message.role === "user").length;
}

function countKolTurnsInState(state, workflowState) {
  return state.messages.filter(
    (message) => message.role === "kol" && message.workflowState === workflowState
  ).length;
}

function yesTrainScore(state, intent) {
  const historyScore = state.intents.filter((entry) =>
    warmIntentSet.has(entry.intent)
  ).length;
  const nowScore = warmIntentSet.has(intent) ? 1 : 0;
  return historyScore + nowScore;
}

function selectWorkflowState({ intent, state }) {
  const current = state.workflowState || "A";
  const maxTurn = campaignConfig.dialogueRules.maxKolTurnsForCta;

  if (current === "A") {
    if (intent === "ai_suspicion") {
      return "A";
    }
    if (warmIntentSet.has(intent) || countUserTurns(state) >= 2) {
      return "B";
    }
    return "A";
  }

  if (current === "B") {
    const score = yesTrainScore(state, intent);
    const nearCtaDeadline = state.kolTurnCount >= maxTurn - 1;
    if (conversionIntentSet.has(intent) || score >= 2 || nearCtaDeadline) {
      return "C";
    }
    return "B";
  }

  return "C";
}

function stageAReply(intent, state) {
  const copy = campaignConfig.controlledCopy;
  const disallow = recentKolTexts(state);
  if (intent === "ai_suspicion") {
    return pickVariant(copy.aiSuspicionDeflect, state.turnCount, disallow);
  }

  const stage = copy.stageA;
  if (intent === "casual") return pickVariant(stage.casual, state.turnCount, disallow);
  if (intent === "curiosity" || intent === "engaged") {
    return pickVariant(stage.curiosity, state.turnCount, disallow);
  }
  return pickVariant(stage.default, state.turnCount, disallow);
}

function stageBReply(intent, state) {
  const stage = campaignConfig.controlledCopy.stageB;
  const disallow = recentKolTexts(state);

  if (intent === "pricing_interest") {
    return `${pickVariant(stage.pricing_interest, state.turnCount, disallow)} ${pickVariant(stage.tease, state.kolTurnCount, disallow)}`;
  }
  if (intent === "objection") {
    return pickVariant(stage.objection, state.turnCount, disallow);
  }
  if (intent === "emotional_need") {
    return pickVariant(stage.emotional_need, state.turnCount, disallow);
  }
  if (intent === "trust") {
    return pickVariant(stage.trust, state.turnCount, disallow);
  }
  if (intent === "affirmative" || intent === "flirty") {
    return pickVariant(stage.yesTrain, state.turnCount, disallow);
  }

  return pickVariant(stage.default, state.turnCount, disallow);
}

function buildPaymentLine(state) {
  const template = pickVariant(
    campaignConfig.controlledCopy.stageC.paymentPush,
    state.turnCount
  );
  return template
    .replace("[PRICE]", campaignConfig.offer.privateAccessPrice)
    .replace("[PAYMENT_LINK]", campaignConfig.offer.paymentInstruction);
}

function stageCReply(intent, state) {
  const stage = campaignConfig.controlledCopy.stageC;
  const cTurns = countKolTurnsInState(state, "C");
  const disallow = recentKolTexts(state);

  if (intent === "objection") {
    return pickVariant(stage.objectionRecovery, state.turnCount, disallow);
  }

  if (cTurns === 0) return pickVariant(stage.seedExclusive, state.turnCount, disallow);
  if (cTurns === 1) return pickVariant(stage.curiosityPause, state.turnCount, disallow);
  if (cTurns === 2) return pickVariant(stage.vulnerabilityFrame, state.turnCount, disallow);
  if (cTurns === 3) return pickVariant(stage.softCommit, state.turnCount, disallow);

  return buildPaymentLine(state);
}

export function buildSystemPromptBundle() {
  return {
    systemPrompt: campaignConfig.prompt.systemPrompt,
    forbiddenBehaviors: [...campaignConfig.prompt.forbiddenBehaviors],
    fewShotExamples: [...campaignConfig.prompt.fewShotExamples]
  };
}

export function getOpeningMessage() {
  const opener = pickVariant(
    campaignConfig.controlledCopy.stageA.opener,
    Math.floor(Math.random() * 100000)
  );
  return {
    role: "kol",
    text: opener,
    workflowState: "A",
    stage: stageByWorkflow.A,
    intent: "opening",
    showCta: false
  };
}

export function buildKolReply({ userText, state }) {
  const intent = classifyIntent(userText);
  const workflowState = selectWorkflowState({ intent, state });
  const stage = stageByWorkflow[workflowState];

  let text = "";
  if (workflowState === "A") {
    text = stageAReply(intent, state);
  } else if (workflowState === "B") {
    text = stageBReply(intent, state);
  } else {
    text = stageCReply(intent, state);
  }

  const showCta = workflowState === "C";

  return {
    role: "kol",
    text,
    workflowState,
    stage,
    intent,
    showCta
  };
}
