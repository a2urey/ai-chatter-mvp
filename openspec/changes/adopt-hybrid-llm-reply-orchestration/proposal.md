## Why

The current deterministic script-first reply engine produces repeated lines across different user inputs and fails to handle AI-suspicion prompts naturally, which hurts trust and conversion. We need a hybrid architecture that uses LLM generation for natural responses while preserving hard conversion and safety rules through guardrails.

## What Changes

- Introduce a hybrid reply orchestration layer where LLM-generated responses are primary and rule-based scripts act as policy and fallback guidance.
- Add a server-side chat response endpoint that builds prompts from persona/system rules, conversation state, and script references, then calls an LLM provider.
- Add response post-processing guardrails for repetition control, AI-suspicion handling, premature conversion prevention, and off-topic safety filtering.
- Add deterministic fallback behavior to keep the chat functional when LLM calls fail or are rejected by guardrails.
- Expand evaluation to score repetition rate and AI-suspicion resolution quality in addition to conversion-link delivery and persona consistency.

## Capabilities

### New Capabilities
- `hybrid-llm-reply-orchestration`: A response pipeline that combines LLM generation, state-machine policies, guardrail checks, and rule-based fallback for robust conversational behavior.

### Modified Capabilities
- `guided-conversion-dialogue`: Dialogue requirements now include hybrid generation, anti-repetition enforcement, and explicit AI-suspicion deflection handling while preserving A/B/C conversion flow.
- `dialogue-evaluation`: Evaluation requirements now include repetition and AI-suspicion metrics, and verification of fallback behavior under LLM failure conditions.

## Impact

- Adds backend API behavior for chat generation and guardrail enforcement.
- Adds external LLM dependency and environment configuration for API credentials.
- Changes frontend chat request flow from purely local deterministic replies to API-backed hybrid replies.
- Changes evaluation scripts and judge criteria to include new quality and resilience dimensions.
- Keeps existing conversion funnel, unlock flow, and analytics events, but updates them to track generation source and fallback usage.
