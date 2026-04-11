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
    "later",
    "hesitate",
    "too much",
    "expensive",
    "no thanks",
    "算了",
    "不想",
    "先不"
  ],
  high_intent: [
    "whatsapp",
    "private",
    "contact",
    "unlock",
    "link",
    "add me",
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

export function classifyIntent(input) {
  const text = input.trim().toLowerCase();
  if (!text) {
    return "casual";
  }

  if (includesAny(text, keywordMap.ai_suspicion)) return "ai_suspicion";
  if (includesAny(text, keywordMap.high_intent)) return "high_intent";
  if (includesAny(text, keywordMap.pricing_interest)) return "pricing_interest";
  if (includesAny(text, keywordMap.objection)) return "objection";
  if (includesAny(text, keywordMap.trust)) return "trust";
  if (includesAny(text, keywordMap.emotional_need)) return "emotional_need";
  if (includesAny(text, keywordMap.affirmative)) return "affirmative";
  if (includesAny(text, keywordMap.flirty)) return "flirty";

  if (text.endsWith("?")) return "curiosity";
  if (text.length < 14) return "casual";
  return "engaged";
}
