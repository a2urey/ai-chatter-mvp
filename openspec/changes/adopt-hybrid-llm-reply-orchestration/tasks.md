## 1. Foundation and Configuration

- [x] 1.1 Add configuration for LLM provider credentials, timeout, retry policy, and hybrid-mode feature flag
- [x] 1.2 Define shared orchestrator data contracts for chat input, state context, candidate response, guardrail result, and fallback metadata
- [x] 1.3 Create a reusable prompt-builder module that combines persona system prompt, state context, script references, and recent conversation history

## 2. Hybrid Orchestrator Backend

- [x] 2.1 Implement server-side chat response endpoint that accepts session state and user message and returns a hybrid reply payload
- [x] 2.2 Integrate primary LLM generation call with bounded timeout handling and structured error mapping
- [x] 2.3 Implement state-policy gating that enforces A/B/C progression and CTA timing constraints before and after generation
- [x] 2.4 Implement deterministic fallback generation path for provider failure, timeout, and guardrail rejection cases

## 3. Guardrails and Quality Controls

- [x] 3.1 Add AI-suspicion intent branch with persona-safe non-admission deflection handling
- [x] 3.2 Add response repetition detection against recent KOL turns with configurable similarity threshold and regenerate-then-fallback behavior
- [x] 3.3 Add hard post-generation policy checks for forbidden topics, premature conversion pushes, and unapproved offer claims
- [x] 3.4 Emit per-turn metadata for generation source (`llm` or `fallback`) and guardrail/fallback reason

## 4. Frontend and Analytics Integration

- [x] 4.1 Update client chat flow to call the new response endpoint instead of local deterministic-only generation
- [x] 4.2 Preserve UX continuity with typing/loading state and graceful fallback messaging when backend generation fails
- [x] 4.3 Extend analytics events to include generation source, fallback reason, and AI-suspicion handling outcomes

## 5. Evaluation, Validation, and Rollout

- [x] 5.1 Extend automated evaluation runs to include AI-suspicion test cases and fallback-trigger scenarios
- [x] 5.2 Add evaluation metrics and pass/fail checks for near-duplicate reply rate and AI-suspicion resolution quality
- [x] 5.3 Run side-by-side baseline comparison (script-only vs hybrid) and document quality deltas before enabling hybrid mode by default
- [x] 5.4 Add staged rollout controls and rollback switch to disable hybrid mode and revert to deterministic replies if quality regresses
