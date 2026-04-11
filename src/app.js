import { campaignConfig } from "./config/campaign.js";
import {
  appendMessage,
  createSessionState,
  markCtaExposed,
  markUnlockClicked,
  markUnlockCompleted,
  pushIntent,
  setDialogueStage,
  setWorkflowState
} from "./state/session.js";
import { createAnalyticsTracker } from "./analytics/tracker.js";
import { buildKolReply, getOpeningMessage } from "./dialogue/engine.js";

const state = createSessionState();
const analytics = createAnalyticsTracker(state.sessionId);

const refs = {
  kolPhoto: document.getElementById("kolPhoto"),
  kolName: document.getElementById("kolName"),
  kolTagline: document.getElementById("kolTagline"),
  topUnlockButton: document.getElementById("topUnlockButton"),
  chatLog: document.getElementById("chatLog"),
  ctaZone: document.getElementById("ctaZone"),
  emojiQuickKeys: document.getElementById("emojiQuickKeys"),
  composer: document.getElementById("composer"),
  chatInput: document.getElementById("chatInput"),
  sendButton: document.getElementById("sendButton")
};

function safeText(value) {
  return String(value).replace(/[<>]/g, "");
}

function formatBrowserTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function randomReplyDelayMs() {
  return 3000 + Math.floor(Math.random() * 2001);
}

function renderHero() {
  refs.kolPhoto.src = campaignConfig.kol.photoUrl;
  refs.kolPhoto.alt = campaignConfig.kol.photoAlt || `${campaignConfig.kol.name} photo`;
  refs.kolPhoto.addEventListener("error", () => {
    refs.kolPhoto.src = "./src/assets/kol-photo-placeholder.svg";
  });

  refs.kolName.textContent = campaignConfig.kol.name;
  refs.kolTagline.textContent = campaignConfig.kol.title;
  refs.topUnlockButton.innerHTML = `<span class="button-text">+ ${safeText(campaignConfig.offer.conversionCtaText)}</span>`;
}

function appendMessageToLog(message) {
  const row = document.createElement("article");
  row.className = `message-row message-row-${message.role}`;

  if (message.role === "kol") {
    const avatar = document.createElement("span");
    avatar.className = "avatar-dot";
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = `bubble bubble-${message.role}`;
  bubble.innerHTML = `
    <p>${safeText(message.text)}</p>
    <small>${formatBrowserTime()}</small>
  `;
  row.appendChild(bubble);

  refs.chatLog.appendChild(row);
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
}

function renderTypingIndicator() {
  const row = document.createElement("article");
  row.className = "message-row message-row-kol";
  row.dataset.typing = "true";
  row.innerHTML = `
    <span class="avatar-dot"></span>
    <div class="bubble bubble-kol"><p>...</p></div>
  `;
  refs.chatLog.appendChild(row);
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
  return () => {
    row.remove();
  };
}

function setComposerEnabled(enabled) {
  refs.chatInput.disabled = !enabled;
  refs.sendButton.disabled = !enabled;
}

function renderLoadingState() {
  refs.chatLog.innerHTML = `
    <div class="loading-card">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
      <p>Loading conversation...</p>
    </div>
  `;
}

function trackCtaExposure(source) {
  if (state.ctaExposed) {
    return;
  }
  markCtaExposed(state);
  analytics.track("cta_exposed", {
    source,
    kolTurnCount: state.kolTurnCount,
    workflowState: state.workflowState
  });
  analytics.track("unlock_prompt_exposed", {
    source,
    kolTurnCount: state.kolTurnCount,
    workflowState: state.workflowState
  });
}

function renderCtaHint() {
  refs.ctaZone.innerHTML = "<p class=\"cta-hint\">Tap the blue button above to unlock WhatsApp.</p>";
}

function completeUnlock(source) {
  if (state.unlock.completed) {
    window.open(campaignConfig.offer.whatsappLink, "_blank", "noopener,noreferrer");
    return;
  }

  markUnlockClicked(state);
  analytics.track("unlock_click", {
    source,
    workflowState: state.workflowState
  });

  markUnlockCompleted(state);
  analytics.track("unlock_complete", {
    source,
    contact: campaignConfig.offer.whatsappDisplay
  });

  refs.topUnlockButton.classList.remove("is-active");
  refs.topUnlockButton.classList.add("is-done", "is-flipped");
  refs.topUnlockButton.innerHTML = "<span class=\"button-text\">+44 7700 900 215<br />Chat On WhatsApp</span>";

  refs.ctaZone.innerHTML = "";
}

function ensureCtaVisible() {
  trackCtaExposure("dialogue");
  refs.topUnlockButton.classList.add("is-active");
  renderCtaHint();
}

function postKolMessage(message, meta = {}) {
  appendMessage(state, message);
  setWorkflowState(state, message.workflowState);
  setDialogueStage(state, message.stage);
  appendMessageToLog(message);

  const generationSource = message.generationSource || meta.generationSource || "fallback";
  const fallbackReason = message.fallbackReason || meta.fallbackReason || null;
  const guardrailReason = message.guardrailReason || meta.guardrailReason || null;

  analytics.track("kol_turn", {
    workflowState: message.workflowState,
    stage: message.stage,
    showCta: message.showCta,
    generationSource,
    fallbackReason,
    guardrailReason
  });

  if (generationSource === "fallback") {
    analytics.track("fallback_used", {
      workflowState: message.workflowState,
      fallbackReason
    });
  }

  if (meta.aiSuspicionHandled || message.intent === "ai_suspicion") {
    analytics.track("ai_suspicion_handled", {
      generationSource,
      fallbackReason
    });
  }

  if (message.showCta) {
    ensureCtaVisible();
  }
}

function getLastKolMessageText() {
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    if (state.messages[i].role === "kol") {
      return String(state.messages[i].text || "").trim().toLowerCase();
    }
  }
  return "";
}

function buildApiPayload(userText) {
  return {
    sessionId: state.sessionId,
    userText,
    stateContext: {
      workflowState: state.workflowState,
      dialogueStage: state.dialogueStage,
      kolTurnCount: state.kolTurnCount,
      turnCount: state.turnCount,
      ctaExposed: state.ctaExposed,
      intents: state.intents,
      unlock: state.unlock
    },
    history: state.messages.map((message) => ({
      role: message.role,
      text: message.text,
      workflowState: message.workflowState,
      stage: message.stage,
      timestamp: message.timestamp
    }))
  };
}

async function requestHybridReply(userText) {
  try {
    const response = await fetch("/api/chat/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildApiPayload(userText))
    });

    if (!response.ok) {
      throw new Error(`chat endpoint failed (${response.status})`);
    }
    const payload = await response.json();
    if (!payload?.reply?.text) {
      throw new Error("chat endpoint returned invalid payload");
    }

    if (payload?.meta?.generationSource && payload.meta.generationSource !== "llm") {
      console.warn("[hybrid] fallback used:", payload.meta);
    }

    return payload;
  } catch (error) {
    const fallback = buildKolReply({
      userText,
      state
    });
    return {
      reply: {
        ...fallback,
        generationSource: "fallback",
        fallbackReason: "client_request_failed",
        guardrailReason: null
      },
      meta: {
        generationSource: "fallback",
        fallbackReason: "client_request_failed",
        guardrailReason: null,
        aiSuspicionHandled: fallback.intent === "ai_suspicion",
        retryCount: 0,
        error: String(error?.message || error)
      }
    };
  }
}

async function sendUserMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const userMessage = {
    role: "user",
    text: trimmed,
    workflowState: state.workflowState,
    stage: state.dialogueStage
  };
  appendMessage(state, userMessage);
  appendMessageToLog(userMessage);

  const isFirstReply =
    state.firstUserReplyAt !== null && state.messages.filter((m) => m.role === "user").length === 1;
  if (isFirstReply) {
    analytics.track("first_user_reply", {});
  }
  analytics.track("user_turn", {
    workflowState: state.workflowState
  });

  setComposerEnabled(false);
  const removeTyping = renderTypingIndicator();
  const delayMs = randomReplyDelayMs();
  const payloadPromise = requestHybridReply(trimmed);
  await wait(delayMs);
  const payload = await payloadPromise;
  analytics.track("reply_delay_applied", {
    delayMs
  });
  removeTyping();
  setComposerEnabled(true);
  refs.chatInput.focus();

  const reply = payload.reply;
  const lastKolText = getLastKolMessageText();
  const currentReplyText = String(reply.text || "").trim().toLowerCase();
  let resolvedReply = reply;
  let resolvedMeta = payload.meta || {};

  if (lastKolText && currentReplyText && currentReplyText === lastKolText) {
    const antiRepeat = buildKolReply({
      userText: `${trimmed} (fresh phrasing)`,
      state
    });
    resolvedReply = {
      ...antiRepeat,
      generationSource: "fallback",
      fallbackReason: "client_duplicate_override",
      guardrailReason: "duplicate_exact_match"
    };
    resolvedMeta = {
      generationSource: "fallback",
      fallbackReason: "client_duplicate_override",
      guardrailReason: "duplicate_exact_match",
      aiSuspicionHandled: antiRepeat.intent === "ai_suspicion",
      retryCount: 0
    };
    analytics.track("duplicate_override_applied", {
      previous: lastKolText
    });
  }

  if (resolvedReply.intent) {
    pushIntent(state, resolvedReply.intent);
    analytics.track("intent_detected", {
      intent: resolvedReply.intent,
      generationSource:
        resolvedReply.generationSource || resolvedMeta?.generationSource || "fallback"
    });
  }
  postKolMessage(resolvedReply, resolvedMeta);
}

function bindComposer() {
  refs.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = refs.chatInput.value;
    refs.chatInput.value = "";
    void sendUserMessage(value);
  });
}

function insertEmojiAtCursor(emoji) {
  const input = refs.chatInput;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const nextValue = `${before}${emoji}${after}`;
  input.value = nextValue;
  const cursor = start + emoji.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

function bindEmojiQuickKeys() {
  refs.emojiQuickKeys.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-emoji]");
    if (!button) return;
    const emoji = button.dataset.emoji || "";
    if (!emoji) return;
    insertEmojiAtCursor(emoji);
  });
}

function bindUnlockButton() {
  refs.topUnlockButton.addEventListener("click", () => {
    trackCtaExposure("hero-button");
    completeUnlock("hero-button");
  });
}

function boot() {
  renderHero();
  analytics.track("page_view", {
    campaignId: campaignConfig.campaignId
  });
  trackCtaExposure("hero-render");
  renderCtaHint();

  setComposerEnabled(false);
  renderLoadingState();

  bindComposer();
  bindEmojiQuickKeys();
  bindUnlockButton();

  window.setTimeout(() => {
    refs.chatLog.innerHTML = "";
    const opening = getOpeningMessage();
    postKolMessage(
      {
        ...opening,
        generationSource: "fallback",
        fallbackReason: "script_opening"
      },
      {
        generationSource: "fallback",
        fallbackReason: "script_opening"
      }
    );
    analytics.track("auto_greeting_rendered", {
      workflowState: opening.workflowState
    });
    setComposerEnabled(true);
  }, 2000);
}

window.addEventListener("beforeunload", () => {
  if (!state.unlock.completed) {
    if (state.ctaExposed) {
      analytics.track("unlock_abandonment", {
        kolTurnCount: state.kolTurnCount,
        workflowState: state.workflowState
      });
    }
    analytics.track("drop_off", {
      kolTurnCount: state.kolTurnCount,
      workflowState: state.workflowState
    });
  }
});

boot();
