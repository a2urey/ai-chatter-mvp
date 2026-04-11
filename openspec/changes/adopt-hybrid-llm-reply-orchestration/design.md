## Context

The current chat engine is deterministic and script-driven, which keeps policy control but causes repetitive responses across different user inputs. Recent product feedback shows two conversion blockers: users perceive replies as mechanical, and AI-suspicion prompts are not resolved in a convincing persona-safe way.

The project also has strict conversion and brand constraints inherited from existing specs: preserve A/B/C funnel progression, avoid premature conversion pushes, and avoid explicit AI admission. This makes a pure free-form LLM approach risky. The design therefore needs a hybrid architecture that improves naturalness while retaining hard guardrails.

## Goals / Non-Goals

**Goals:**
- Use LLM-generated replies as the primary output path for more natural, less repetitive chat behavior.
- Preserve hard policy control through state-machine gating and post-generation guardrails.
- Handle AI-suspicion intent with reliable persona-safe deflection.
- Keep chat continuity under provider failure through deterministic fallback.
- Expand evaluation to include repetition quality, AI-suspicion resolution, and fallback reliability.

**Non-Goals:**
- Building a fully autonomous unconstrained roleplay agent.
- Replacing existing funnel-state logic with model-only planning.
- Supporting multiple LLM providers in the first implementation.
- Introducing payment logic changes or conversion funnel redesign.

## Decisions

### 1. Adopt a layered hybrid response pipeline

We will introduce a server-side pipeline with four layers:
1) policy/state pre-check, 2) LLM generation, 3) guardrail validation/post-processing, 4) deterministic fallback.

Why:
- Separates natural language generation from business/safety enforcement.
- Makes failure handling explicit and testable.
- Avoids overloading prompts with all safety responsibility.

Alternatives considered:
- Pure script templates were rejected due to repetition and low realism.
- Pure LLM generation was rejected due to policy drift and inconsistent conversion pacing.

### 2. Keep scripts as retrieval hints, not direct final replies

Existing stage copy and few-shot examples become structured reference material in prompt context. They guide style and intent but are no longer the sole reply source.

Why:
- Preserves proven conversion framing while improving linguistic variation.
- Reduces repeated literal lines.

Alternatives considered:
- Keeping script-first with random variant selection was rejected as insufficient to solve semantic repetition.

### 3. Use deterministic hard checks after generation

Every LLM candidate will be validated for:
- state compliance (A/B/C order, CTA timing),
- banned content (AI admission, disallowed topics),
- offer-claim constraints (approved copy only),
- repetition threshold (near-duplicate detection vs recent KOL turns).

Failed candidates trigger regenerate-once behavior, then fallback if still invalid.

Why:
- Prevents unsafe or off-strategy responses from reaching users.
- Keeps behavior predictable for measurement.

Alternatives considered:
- Prompt-only constraints were rejected because they are insufficiently deterministic in edge cases.

### 4. Add explicit AI-suspicion intent branch before normal generation

When user intent is AI suspicion, the orchestrator routes to a persona-safe deflection strategy first, then resumes normal flow.

Why:
- This is a known conversion-critical failure mode.
- Dedicated handling improves consistency and trust preservation.

Alternatives considered:
- Letting generic LLM prompts handle suspicion implicitly was rejected due to inconsistent results.

### 5. Track generation source and fallback in analytics

Each KOL turn will include metadata fields such as `generation_source` (`llm` or `fallback`) and `guardrail_reason` (if fallback triggered).

Why:
- Needed for root-cause analysis when conversations underperform.
- Enables evaluation and production monitoring of hybrid reliability.

Alternatives considered:
- Keeping current analytics schema was rejected because it cannot explain hybrid-path failures.

## Risks / Trade-offs

- [Risk] LLM latency may slow perceived responsiveness. -> Mitigation: strict timeout, optimistic typing indicator, and deterministic fallback.
- [Risk] Prompt drift may produce subtle policy violations. -> Mitigation: hard post-generation guardrails and reject/regenerate flow.
- [Risk] Extra orchestration complexity raises maintenance cost. -> Mitigation: isolate pipeline stages with clear interfaces and test fixtures.
- [Risk] Cost increase from LLM calls. -> Mitigation: short context windows, bounded retries, and selective fallback on low-value turns.
- [Risk] Over-filtering may reduce conversational warmth. -> Mitigation: tune guardrail thresholds using offline transcript evaluation and staged rollout.

## Migration Plan

1. Add server chat-response endpoint that accepts conversation state and returns hybrid replies.
2. Implement orchestrator stages: intent/state policy, prompt assembly, LLM call, guardrail validation, fallback.
3. Update frontend send flow to call endpoint and consume enriched response metadata.
4. Extend analytics events with generation source and fallback reason fields.
5. Expand evaluation scripts to test repetition, AI-suspicion handling, and fallback scenarios.
6. Run shadow evaluation against existing script engine baseline; launch hybrid mode behind a flag.
7. Gradually ramp traffic and monitor quality metrics before full rollout.

Rollback strategy:
- Keep deterministic script engine available as a feature flag fallback.
- Disable LLM mode globally if provider instability or policy regressions are detected.

## Open Questions

- Which LLM model and max token budget should be the default for first rollout?
- Should regenerate attempts be capped at one or two before deterministic fallback?
- What exact similarity algorithm and threshold should define “mechanical repetition”?
- Should AI-suspicion replies always use fixed templates or allow constrained generation variants?
