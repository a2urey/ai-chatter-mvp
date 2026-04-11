function toBoolean(value, fallback) {
  if (value === undefined) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getHybridRuntimeConfig(runtimeOverrides = {}) {
  const env = process.env;
  const llm = runtimeOverrides.llm || {};
  const provider = llm.provider || env.LLM_PROVIDER || "openai";
  const providerLower = String(provider).toLowerCase();
  const defaultBaseUrl =
    providerLower === "deepseek" ? "https://api.deepseek.com" : "https://api.openai.com/v1";
  const defaultModel = providerLower === "deepseek" ? "deepseek-chat" : "gpt-4o-mini";
  const providerKey =
    providerLower === "deepseek" ? env.DEEPSEEK_API_KEY : env.OPENAI_API_KEY;

  return {
    hybridEnabled: toBoolean(runtimeOverrides.hybridEnabled ?? env.HYBRID_MODE, true),
    llm: {
      provider,
      apiKey: llm.apiKey || env.LLM_API_KEY || providerKey || "",
      model: llm.model || env.LLM_MODEL || defaultModel,
      baseUrl: llm.baseUrl || env.LLM_BASE_URL || defaultBaseUrl,
      timeoutMs: toNumber(llm.timeoutMs ?? env.LLM_TIMEOUT_MS, 7000),
      maxRetries: toNumber(llm.maxRetries ?? env.LLM_MAX_RETRIES, 1),
      temperature: toNumber(llm.temperature ?? env.LLM_TEMPERATURE, 0.8)
    },
    guardrails: {
      repetitionThreshold: toNumber(
        runtimeOverrides?.guardrails?.repetitionThreshold ?? env.REPETITION_THRESHOLD,
        0.78
      ),
      maxHistoryMessages: toNumber(
        runtimeOverrides?.guardrails?.maxHistoryMessages ?? env.MAX_HISTORY_MESSAGES,
        12
      )
    }
  };
}
