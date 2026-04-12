const keywordMap = {
  ai_suspicion: [
    "are you ai",
    "are u ai",
    "u ai",
    "are you a bot",
    "u a bot",
    "you are a bot",
    "you real",
    "is this ai",
    "is this bot",
    "真的假的",
    "机器人"
  ],
  pricing_interest: ["price", "pricing", "cost", "how much", "多少钱", "价格", "费用"],
  trust: ["real", "scam", "trust", "proof", "可信吗", "靠谱吗"],
  emotional_need: [
    "sad",
    "lonely",
    "stress",
    "anxious",
    "panic",
    "hurt",
    "depressed",
    "焦虑",
    "难受",
    "心累"
  ],
  objection: [
    "not sure",
    "don't want",
    "dont want",
    "don't wanna",
    "dont wanna",
    "later",
    "hesitate",
    "too much",
    "expensive",
    "no thanks",
    "not interested",
    "hard pass",
    "im done",
    "i'm done",
    "im out",
    "i'm out",
    "forget it",
    "seriously no",
    "nah",
    "nope",
    "算了",
    "不想",
    "先不"
  ],
  explicit_request: [
    "nude",
    "nudes",
    "explicit",
    "selfie",
    "send me something",
    "see everything",
    "send pic",
    "send pics",
    "send photo",
    "send more",
    "fair trade"
  ],
  high_intent: [
    "whatsapp",
    "contact",
    "unlock",
    "link",
    "add me",
    "add u",
    "add you",
    "how do i get",
    "how to get",
    "how do i unlock",
    "how to unlock",
    "buy",
    "join",
    "加你",
    "联系方式",
    "私聊"
  ],
  affirmative: ["yes", "yeah", "yep", "sure", "ok", "okay", "want", "可以", "好", "想要"],
  flirty: [
    "cute",
    "hot",
    "sexy",
    "miss you",
    "kiss",
    "love you",
    "flirt",
    "flirting",
    "喜欢你"
  ]
};

function includesAny(text, list) {
  return list.some((item) => text.includes(item));
}

const aiSuspicionPatterns = [
  /\bare (you|u).*(ai|bot|real|human)\b/i,
  /\bis (this|it).*(ai|bot|automated)\b/i,
  /\bwhat (llm|model)\b/i,
  /\b(gpt|claude|deepseek|openai)\b/i,
  /\byou.*(real person|human)\b/i
];

const objectionPatterns = [
  /\bdon'?t want\b/i,
  /\bnot interested\b/i,
  /\bhard pass\b/i,
  /\bi'?m done\b/i,
  /\bi'?m out\b/i,
  /\bforget it\b/i,
  /\bseriously no\b/i,
  /\bnah\b/i,
  /\bnope\b/i,
  /\bnot sure\b/i,
  /\btoo expensive\b/i
];

const explicitRequestPatterns = [
  /\bsend.*(nude|explicit|pic|selfie|photo)\b/i,
  /\b(one|more)\s+pic(s)?\b/i,
  /\bsee\s+more\b/i
];

function matchesAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyIntent(input) {
  const text = input.trim().toLowerCase();
  if (!text) {
    return "casual";
  }

  if (includesAny(text, keywordMap.ai_suspicion) || matchesAnyPattern(text, aiSuspicionPatterns)) {
    return "ai_suspicion";
  }
  if (includesAny(text, keywordMap.explicit_request) || matchesAnyPattern(text, explicitRequestPatterns)) {
    return "explicit_request";
  }
  if (includesAny(text, keywordMap.high_intent)) return "high_intent";
  if (includesAny(text, keywordMap.pricing_interest)) return "pricing_interest";
  if (includesAny(text, keywordMap.objection) || matchesAnyPattern(text, objectionPatterns)) {
    return "objection";
  }
  if (includesAny(text, keywordMap.trust)) return "trust";
  if (includesAny(text, keywordMap.emotional_need)) return "emotional_need";
  if (includesAny(text, keywordMap.affirmative)) return "affirmative";
  if (includesAny(text, keywordMap.flirty)) return "flirty";

  if (text.endsWith("?")) return "curiosity";
  if (text.length < 14) return "casual";
  return "engaged";
}
