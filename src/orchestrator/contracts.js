function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((item) => ({
      role: item?.role === "kol" ? "kol" : "user",
      text: safeString(item?.text).trim(),
      workflowState: safeString(item?.workflowState),
      stage: safeString(item?.stage),
      timestamp: safeString(item?.timestamp)
    }))
    .filter((item) => item.text.length > 0);
}

export function normalizeStateContext(stateContext, history) {
  const kolTurnsFromHistory = history.filter((item) => item.role === "kol").length;
  const base = stateContext || {};
  return {
    workflowState: safeString(base.workflowState, "A"),
    dialogueStage: safeString(base.dialogueStage, "rapport"),
    kolTurnCount: safeNumber(base.kolTurnCount, kolTurnsFromHistory),
    turnCount: safeNumber(base.turnCount, history.length),
    ctaExposed: Boolean(base.ctaExposed),
    intents: Array.isArray(base.intents) ? base.intents : [],
    unlock: {
      clicked: Boolean(base?.unlock?.clicked),
      completed: Boolean(base?.unlock?.completed)
    },
    messages: history
  };
}

export function normalizeChatRequest(body) {
  const userText = safeString(body?.userText).trim();
  const history = normalizeHistory(body?.history);
  const stateContext = normalizeStateContext(body?.stateContext, history);

  return {
    sessionId: safeString(body?.sessionId),
    userText,
    history,
    stateContext
  };
}

export function createHybridResponse(reply, meta = {}) {
  return {
    reply,
    meta: {
      generationSource: meta.generationSource || "fallback",
      fallbackReason: meta.fallbackReason || null,
      guardrailReason: meta.guardrailReason || null,
      aiSuspicionHandled: Boolean(meta.aiSuspicionHandled),
      retryCount: Number.isFinite(meta.retryCount) ? meta.retryCount : 0,
      decisionTrace: meta.decisionTrace || null
    }
  };
}
