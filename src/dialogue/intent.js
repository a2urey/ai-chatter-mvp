const keywordMap = {
  pricing_interest: [
    "price",
    "pricing",
    "cost",
    "how much",
    "多少钱",
    "价格",
    "费用"
  ],
  trust: [
    "real",
    "真的假的",
    "真的假的",
    "scam",
    "trust",
    "靠谱吗",
    "可信吗",
    "proof"
  ],
  emotional_need: [
    "sad",
    "lonely",
    "stress",
    "anxious",
    "panic",
    "崩溃",
    "焦虑",
    "难受",
    "心累"
  ],
  objection: ["not sure", "don't want", "later", "hesitate", "算了", "不想", "先不"],
  high_intent: ["whatsapp", "contact", "unlock", "link", "加你", "联系方式", "私聊"]
};

function includesAny(text, list) {
  return list.some((item) => text.includes(item));
}

export function classifyIntent(input) {
  const text = input.trim().toLowerCase();
  if (!text) {
    return "casual";
  }

  if (includesAny(text, keywordMap.high_intent)) {
    return "high_intent";
  }
  if (includesAny(text, keywordMap.pricing_interest)) {
    return "pricing_interest";
  }
  if (includesAny(text, keywordMap.trust)) {
    return "trust";
  }
  if (includesAny(text, keywordMap.emotional_need)) {
    return "emotional_need";
  }
  if (includesAny(text, keywordMap.objection)) {
    return "objection";
  }
  if (text.length < 20) {
    return "casual";
  }
  return "curiosity";
}
