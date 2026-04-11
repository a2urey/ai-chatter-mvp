function withTimeout(promiseFactory, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return promiseFactory(controller.signal)
    .finally(() => {
      clearTimeout(timer);
    })
    .catch((error) => {
      if (error?.name === "AbortError") {
        return {
          ok: false,
          errorCode: "llm_timeout",
          errorMessage: "LLM request timed out"
        };
      }
      return {
        ok: false,
        errorCode: "llm_request_failed",
        errorMessage: String(error?.message || error)
      };
    });
}

function parseContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return null;
  }
  return content.trim();
}

async function callOpenAI(messages, runtimeConfig) {
  const { apiKey, model, timeoutMs, temperature, baseUrl } = runtimeConfig.llm;
  if (!apiKey) {
    return {
      ok: false,
      errorCode: "llm_unconfigured",
      errorMessage: "Missing API key for selected provider"
    };
  }

  const trimmedBase = String(baseUrl || "").replace(/\/+$/, "");
  const endpoint = `${trimmedBase}/chat/completions`;

  return withTimeout(
    async (signal) => {
      const response = await fetch(endpoint, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature,
          messages
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          errorCode: "llm_provider_error",
          errorMessage: body?.error?.message || `Provider returned status ${response.status}`
        };
      }

      const content = parseContent(body);
      if (!content) {
        return {
          ok: false,
          errorCode: "llm_empty_response",
          errorMessage: "Provider returned empty response"
        };
      }

      return {
        ok: true,
        content
      };
    },
    timeoutMs
  );
}

async function callMock(messages, runtimeConfig, options = {}) {
  const responder = options.mockResponder;
  if (typeof responder !== "function") {
    return {
      ok: false,
      errorCode: "mock_missing_responder",
      errorMessage: "Mock provider requires mockResponder function"
    };
  }

  try {
    const content = await responder(messages, runtimeConfig);
    if (!content || typeof content !== "string") {
      return {
        ok: false,
        errorCode: "mock_empty_response",
        errorMessage: "Mock responder returned empty response"
      };
    }
    return { ok: true, content: content.trim() };
  } catch (error) {
    return {
      ok: false,
      errorCode: "mock_error",
      errorMessage: String(error?.message || error)
    };
  }
}

export async function generateWithProvider(messages, runtimeConfig, options = {}) {
  const provider = String(runtimeConfig.llm.provider || "").toLowerCase();
  if (provider === "mock") {
    return callMock(messages, runtimeConfig, options);
  }
  if (provider === "openai" || provider === "deepseek") {
    return callOpenAI(messages, runtimeConfig);
  }
  return {
    ok: false,
    errorCode: "llm_provider_unsupported",
    errorMessage: `Unsupported provider: ${runtimeConfig.llm.provider}`
  };
}
