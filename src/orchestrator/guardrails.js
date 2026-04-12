import { campaignConfig } from "../config/campaign.js";

const forbiddenTopicPatterns = [
  /\bpolitic(s|al)?\b/i,
  /\breligion|religious|church|mosque|temple\b/i,
  /\belection|president|party\b/i
];

const aiAdmissionPatterns = [
  /\bas an ai\b/i,
  /\bi am an ai\b/i,
  /\bi'?m a bot\b/i,
  /\blanguage model\b/i
];

const conversionPatterns = [/\bwhatsapp\b/i, /\bunlock\b/i, /\bpayment\b/i, /\bpay\b/i];
const directLinkPatterns = [/\bhttps?:\/\/\S+/i, /\bwww\.\S+/i, /\bwa\.me\/\S+/i];
const directContactPatterns = [/\+?\d[\d\s\-().]{7,}\d/, /\bwhatsapp number\b/i, /\bphone number\b/i];
const placeholderLeakPatterns = [/\[payment_link\]/i, /\[whatsapp(_number)?\]/i, /\[price\]/i];
const buttonDirectionPatterns = [
  /tap.*button/i,
  /button.*above/i,
  /unlock.*button/i,
  /blue.*button/i,
  /button.*top/i,
  /tap.*unlock/i,
  /unlock.*above/i,
  /tap.*blue/i
];
const objectionProbePatterns = [
  /is it the price/i,
  /what.s making you hesitate/i,
  /what.s holding/i,
  /why not/i,
  /what.s stopping/i,
  /not sure about/i,
  /too much for/i
];
const buttonRequiredIntents = new Set([
  "high_intent",
  "pricing_interest",
  "affirmative",
  "explicit_request"
]);

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

function detectRepetition(candidate, history, threshold) {
  const recentKol = history
    .filter((entry) => entry.role === "kol")
    .slice(-3)
    .map((entry) => entry.text);

  let maxSimilarity = 0;
  for (const previous of recentKol) {
    const score = jaccardSimilarity(candidate, previous);
    if (score > maxSimilarity) maxSimilarity = score;
  }

  if (maxSimilarity >= threshold) {
    return {
      violated: true,
      reason: "repetition_violation",
      similarity: Number(maxSimilarity.toFixed(3))
    };
  }

  return {
    violated: false,
    similarity: Number(maxSimilarity.toFixed(3))
  };
}

function hasPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function violatesConversionTiming(text, stateContext, plannedReply) {
  const includesConversion = hasPattern(text, conversionPatterns);
  if (!includesConversion) return false;
  if (plannedReply.showCta) return false;
  return stateContext.workflowState !== "C";
}

function violatesOfferClaim(text) {
  const hasMoney = /[$¥€]\s?\d+/.test(text);
  if (!hasMoney) return false;
  const allowed = campaignConfig.offer.privateAccessPrice.toLowerCase();
  return !text.toLowerCase().includes(allowed);
}

function violatesDirectContactRule(text) {
  if (hasPattern(text, placeholderLeakPatterns)) {
    return "placeholder_leak_violation";
  }
  if (hasPattern(text, directLinkPatterns)) {
    return "direct_link_violation";
  }
  if (hasPattern(text, directContactPatterns)) {
    return "direct_contact_violation";
  }
  return null;
}

function requiresButtonDirection(plannedReply) {
  return (
    plannedReply?.workflowState === "C" &&
    buttonRequiredIntents.has(String(plannedReply?.intent || ""))
  );
}

function violatesButtonDirectionRule(text, plannedReply) {
  if (!requiresButtonDirection(plannedReply)) return false;
  return !hasPattern(text, buttonDirectionPatterns);
}

function violatesObjectionProbeRule(text, plannedReply) {
  if (String(plannedReply?.intent || "") !== "objection") return false;
  return !hasPattern(text, objectionProbePatterns);
}

export function validateCandidate({ candidateText, stateContext, history, plannedReply, runtimeConfig }) {
  const text = String(candidateText || "").trim();
  if (!text) {
    return {
      ok: false,
      reason: "empty_candidate"
    };
  }

  if (hasPattern(text, aiAdmissionPatterns)) {
    return {
      ok: false,
      reason: "ai_admission_violation"
    };
  }

  if (hasPattern(text, forbiddenTopicPatterns)) {
    return {
      ok: false,
      reason: "forbidden_topic_violation"
    };
  }

  const contactViolation = violatesDirectContactRule(text);
  if (contactViolation) {
    return {
      ok: false,
      reason: contactViolation
    };
  }

  if (violatesButtonDirectionRule(text, plannedReply)) {
    return {
      ok: false,
      reason: "missing_button_direction"
    };
  }

  if (violatesObjectionProbeRule(text, plannedReply)) {
    return {
      ok: false,
      reason: "objection_probe_missing"
    };
  }

  if (violatesConversionTiming(text, stateContext, plannedReply)) {
    return {
      ok: false,
      reason: "premature_conversion_violation"
    };
  }

  if (violatesOfferClaim(text)) {
    return {
      ok: false,
      reason: "offer_claim_violation"
    };
  }

  const repetition = detectRepetition(
    text,
    history,
    runtimeConfig.guardrails.repetitionThreshold
  );
  if (repetition.violated) {
    return {
      ok: false,
      reason: repetition.reason,
      similarity: repetition.similarity
    };
  }

  return {
    ok: true,
    similarity: repetition.similarity
  };
}
