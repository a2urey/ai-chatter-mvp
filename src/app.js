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

function postKolMessage(message) {
  appendMessage(state, message);
  setWorkflowState(state, message.workflowState);
  setDialogueStage(state, message.stage);
  appendMessageToLog(message);
  analytics.track("kol_turn", {
    workflowState: message.workflowState,
    stage: message.stage,
    showCta: message.showCta
  });

  if (message.showCta) {
    ensureCtaVisible();
  }
}

function sendUserMessage(text) {
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

  const isFirstReply = state.firstUserReplyAt !== null && state.messages.filter((m) => m.role === "user").length === 1;
  if (isFirstReply) {
    analytics.track("first_user_reply", {});
  }
  analytics.track("user_turn", {
    workflowState: state.workflowState
  });

  const reply = buildKolReply({
    userText: trimmed,
    state
  });
  pushIntent(state, reply.intent);
  analytics.track("intent_detected", { intent: reply.intent });
  postKolMessage(reply);
}

function bindComposer() {
  refs.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = refs.chatInput.value;
    refs.chatInput.value = "";
    sendUserMessage(value);
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
    postKolMessage(opening);
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
