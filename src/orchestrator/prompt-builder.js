import { campaignConfig } from "../config/campaign.js";

function safeHistorySlice(history, maxMessages) {
  return history.slice(Math.max(0, history.length - maxMessages));
}

function formatScriptHints() {
  const copy = campaignConfig.controlledCopy;
  const summarize = (label, value) => {
    if (Array.isArray(value)) return `${label}: ${value.slice(0, 2).join(" | ")}`;
    return `${label}: ${String(value)}`;
  };

  return [
    "Script references (guidance, do not copy verbatim):",
    summarize("A opener", copy.stageA.opener),
    summarize("A casual", copy.stageA.casual),
    summarize("B emotional", copy.stageB.emotional_need),
    summarize("B trust", copy.stageB.trust),
    summarize("B objection", copy.stageB.objection),
    summarize("C seed", copy.stageC.seedExclusive),
    summarize("C vulnerability", copy.stageC.vulnerabilityFrame),
    summarize("C soft commit", copy.stageC.softCommit),
    summarize("C payment", copy.stageC.paymentPush)
  ].join("\n");
}

function mapHistoryToMessages(history) {
  return history.map((item) => ({
    role: item.role === "kol" ? "assistant" : "user",
    content: item.text
  }));
}

export function buildPromptMessages({
  userText,
  intent,
  stateContext,
  fallbackReply,
  runtimeConfig,
  retryHint
}) {
  const recent = safeHistorySlice(
    stateContext.messages || [],
    runtimeConfig.guardrails.maxHistoryMessages
  );

  const policyFrame = [
    `Current workflow state: ${stateContext.workflowState}`,
    `Current dialogue stage: ${stateContext.dialogueStage}`,
    `Detected intent: ${intent}`,
    `Target workflow state for this turn: ${fallbackReply.workflowState}`,
    `Target stage for this turn: ${fallbackReply.stage}`,
    `CTA allowed on this turn: ${fallbackReply.showCta ? "yes" : "no"}`,
    "Never admit being AI or bot. If asked, deflect playfully and stay in persona.",
    "Avoid repetitive phrasing from recent assistant messages.",
    "Do not introduce politics or religion.",
    "Do not reveal WhatsApp number directly in response text."
  ].join("\n");

  const retryFrame = retryHint
    ? `Retry instruction: previous candidate failed guardrails due to ${retryHint}. Generate a different compliant reply.`
    : "";

  return [
    {
      role: "system",
      content: campaignConfig.prompt.systemPrompt
    },
    {
      role: "system",
      content: policyFrame
    },
    {
      role: "system",
      content: formatScriptHints()
    },
    ...(retryFrame
      ? [
          {
            role: "system",
            content: retryFrame
          }
        ]
      : []),
    ...mapHistoryToMessages(recent),
    {
      role: "user",
      content: userText
    }
  ];
}
