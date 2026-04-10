function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionState() {
  return {
    sessionId: randomId(),
    startedAt: new Date().toISOString(),
    messages: [],
    workflowState: "A",
    dialogueStage: "hook",
    turnCount: 0,
    kolTurnCount: 0,
    ctaExposed: false,
    firstUserReplyAt: null,
    intents: [],
    unlock: {
      clicked: false,
      completed: false,
      completedAt: null
    }
  };
}

export function appendMessage(state, message) {
  state.messages.push({
    ...message,
    timestamp: new Date().toISOString()
  });
  state.turnCount += 1;

  if (message.role === "kol") {
    state.kolTurnCount += 1;
  }

  if (message.role === "user" && state.firstUserReplyAt === null) {
    state.firstUserReplyAt = new Date().toISOString();
  }
}

export function setWorkflowState(state, nextState) {
  state.workflowState = nextState;
}

export function setDialogueStage(state, stage) {
  state.dialogueStage = stage;
}

export function pushIntent(state, intent) {
  state.intents.push({
    intent,
    timestamp: new Date().toISOString()
  });
}

export function markCtaExposed(state) {
  state.ctaExposed = true;
}

export function markUnlockClicked(state) {
  state.unlock.clicked = true;
}

export function markUnlockCompleted(state) {
  state.unlock.completed = true;
  state.unlock.completedAt = new Date().toISOString();
}
