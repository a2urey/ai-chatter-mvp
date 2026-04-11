import { campaignConfig } from "../config/campaign.js";
import { buildKolReply } from "../dialogue/engine.js";
import { classifyIntent } from "../dialogue/intent.js";
import { getHybridRuntimeConfig } from "./config.js";
import { normalizeChatRequest, createHybridResponse } from "./contracts.js";
import { buildPromptMessages } from "./prompt-builder.js";
import { generateWithProvider } from "./provider.js";
import { validateCandidate } from "./guardrails.js";

function buildFallbackReply(stateContext, userText, intent) {
  const fallback = buildKolReply({
    userText,
    state: stateContext
  });

  if (intent === "ai_suspicion") {
    const variants = campaignConfig.controlledCopy.aiSuspicionDeflect;
    const text = variants[Math.abs(stateContext.turnCount || 0) % variants.length];
    return {
      ...fallback,
      text,
      workflowState: stateContext.workflowState || "A",
      stage: stateContext.dialogueStage || "rapport",
      intent,
      showCta: false
    };
  }

  return fallback;
}

function formatHybridReply(baseReply, overrides = {}) {
  return {
    ...baseReply,
    generationSource: overrides.generationSource || "fallback",
    fallbackReason: overrides.fallbackReason || null,
    guardrailReason: overrides.guardrailReason || null
  };
}

async function generateCandidate({
  request,
  runtimeConfig,
  fallbackReply,
  intent,
  options,
  retryHint
}) {
  const messages = buildPromptMessages({
    userText: request.userText,
    intent,
    stateContext: request.stateContext,
    fallbackReply,
    runtimeConfig,
    retryHint
  });

  const llmResult = await generateWithProvider(messages, runtimeConfig, options);
  if (!llmResult.ok) {
    return {
      ok: false,
      reason: llmResult.errorCode,
      errorMessage: llmResult.errorMessage
    };
  }

  return {
    ok: true,
    content: llmResult.content
  };
}

export async function orchestrateHybridReply(rawRequest, options = {}) {
  const request = normalizeChatRequest(rawRequest);
  const runtimeConfig = getHybridRuntimeConfig(options.runtimeConfig);
  const intent = classifyIntent(request.userText);
  const fallbackReply = buildFallbackReply(request.stateContext, request.userText, intent);
  const traceBase = {
    detectedIntent: intent,
    workflowStateBefore: request.stateContext.workflowState,
    workflowStatePlanned: fallbackReply.workflowState,
    stagePlanned: fallbackReply.stage,
    provider: runtimeConfig.llm.provider,
    model: runtimeConfig.llm.model,
    hybridEnabled: runtimeConfig.hybridEnabled
  };

  if (!runtimeConfig.hybridEnabled) {
    const reply = formatHybridReply(fallbackReply, {
      generationSource: "fallback",
      fallbackReason: "hybrid_mode_disabled"
    });
    return createHybridResponse(reply, {
      generationSource: reply.generationSource,
      fallbackReason: reply.fallbackReason,
      aiSuspicionHandled: intent === "ai_suspicion",
      retryCount: 0,
      decisionTrace: {
        ...traceBase,
        branch: "hybrid_disabled"
      }
    });
  }

  if (intent === "ai_suspicion") {
    const reply = formatHybridReply(fallbackReply, {
      generationSource: "fallback",
      fallbackReason: "ai_suspicion_policy_branch"
    });
    return createHybridResponse(reply, {
      generationSource: reply.generationSource,
      fallbackReason: reply.fallbackReason,
      aiSuspicionHandled: true,
      retryCount: 0,
      decisionTrace: {
        ...traceBase,
        branch: "ai_suspicion_policy_branch"
      }
    });
  }

  let retryCount = 0;
  let retryHint = "";
  const maxAttempts = Math.max(1, runtimeConfig.llm.maxRetries + 1);

  while (retryCount < maxAttempts) {
    const candidate = await generateCandidate({
      request,
      runtimeConfig,
      fallbackReply,
      intent,
      options,
      retryHint
    });

    if (!candidate.ok) {
      const reply = formatHybridReply(fallbackReply, {
        generationSource: "fallback",
        fallbackReason: candidate.reason
      });
      return createHybridResponse(reply, {
        generationSource: reply.generationSource,
        fallbackReason: reply.fallbackReason,
        aiSuspicionHandled: false,
        retryCount,
        decisionTrace: {
          ...traceBase,
          branch: "provider_failure_fallback",
          reason: candidate.reason,
          errorMessage: candidate.errorMessage || null
        }
      });
    }

    const validation = validateCandidate({
      candidateText: candidate.content,
      stateContext: request.stateContext,
      history: request.history,
      plannedReply: fallbackReply,
      runtimeConfig
    });

    if (validation.ok) {
      const reply = formatHybridReply(
        {
          ...fallbackReply,
          text: candidate.content
        },
        {
          generationSource: "llm"
        }
      );
      return createHybridResponse(reply, {
        generationSource: "llm",
        guardrailReason: null,
        aiSuspicionHandled: false,
        retryCount,
        decisionTrace: {
          ...traceBase,
          branch: "llm_primary",
          retryCount
        }
      });
    }

    retryCount += 1;
    retryHint = validation.reason;
    if (retryCount >= maxAttempts) {
      const reply = formatHybridReply(fallbackReply, {
        generationSource: "fallback",
        fallbackReason: "guardrail_rejected",
        guardrailReason: validation.reason
      });
      return createHybridResponse(reply, {
        generationSource: "fallback",
        fallbackReason: "guardrail_rejected",
        guardrailReason: validation.reason,
        aiSuspicionHandled: false,
        retryCount,
        decisionTrace: {
          ...traceBase,
          branch: "guardrail_rejected_fallback",
          reason: validation.reason,
          retryCount
        }
      });
    }
  }

  const reply = formatHybridReply(fallbackReply, {
    generationSource: "fallback",
    fallbackReason: "unexpected_fallback"
  });
  return createHybridResponse(reply, {
    generationSource: "fallback",
    fallbackReason: "unexpected_fallback",
    aiSuspicionHandled: false,
    retryCount,
    decisionTrace: {
      ...traceBase,
      branch: "unexpected_fallback"
    }
  });
}
