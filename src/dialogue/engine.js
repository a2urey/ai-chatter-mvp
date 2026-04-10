import { campaignConfig } from "../config/campaign.js";
import { classifyIntent } from "./intent.js";

const stageByWorkflow = {
  A: "hook",
  B: "resonance",
  C: "conversion"
};

function stageAReply(intent) {
  const copy = campaignConfig.controlledCopy.stageA;
  if (intent === "curiosity") return copy.curiosity;
  if (intent === "casual") return copy.casual;
  return copy.default;
}

function stageBReply(intent) {
  const copy = campaignConfig.controlledCopy.stageB;
  return copy[intent] || copy.default;
}

function stageCReply() {
  const copy = campaignConfig.controlledCopy.stageC;
  return `${copy.ctaLead} ${copy.ctaBody}`;
}

function selectWorkflowState({ intent, kolTurnCount }) {
  const maxTurn = campaignConfig.dialogueRules.maxKolTurnsForCta;
  if (intent === "high_intent" || intent === "pricing_interest") return "C";
  if (kolTurnCount >= maxTurn - 1) return "C";
  if (intent === "emotional_need" || intent === "objection" || intent === "trust") return "B";
  return "A";
}

export function buildSystemPromptBundle() {
  return {
    systemPrompt: campaignConfig.prompt.systemPrompt,
    forbiddenBehaviors: [...campaignConfig.prompt.forbiddenBehaviors],
    fewShotExamples: [...campaignConfig.prompt.fewShotExamples]
  };
}

export function getOpeningMessage() {
  return {
    role: "kol",
    text:
      "Hey, I am Aria. I read energy fast, so tell me one thing you have been overthinking today and I will help you cut through it.",
    workflowState: "A",
    stage: "hook",
    intent: "opening",
    showCta: false
  };
}

export function buildKolReply({ userText, state }) {
  const intent = classifyIntent(userText);
  const workflowState = selectWorkflowState({
    intent,
    kolTurnCount: state.kolTurnCount
  });
  const stage = stageByWorkflow[workflowState];
  const forceCta = state.kolTurnCount + 1 >= campaignConfig.dialogueRules.maxKolTurnsForCta;
  const showCta = workflowState === "C" || forceCta;

  let text;
  if (showCta) {
    text = stageCReply();
  } else if (workflowState === "B") {
    text = stageBReply(intent);
  } else {
    text = stageAReply(intent);
  }

  return {
    role: "kol",
    text,
    workflowState,
    stage,
    intent,
    showCta
  };
}
