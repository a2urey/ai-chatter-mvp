## ADDED Requirements

### Requirement: Hybrid Orchestrator Uses LLM as Primary Reply Generator
The system SHALL use an LLM-backed generation step as the primary mechanism for producing KOL replies, with inputs that include current workflow state, recent chat history, persona prompt, and script references.

#### Scenario: User sends a normal message
- **WHEN** the user submits a chat message and the generation service is healthy
- **THEN** the system requests an LLM response using state and script context and returns that response as the primary candidate

### Requirement: Rule Guardrails Validate and Shape LLM Output
The system SHALL validate LLM candidates against hard policy rules before sending them to users, including no premature conversion push, no forbidden topic drift, and no explicit AI admission.

#### Scenario: LLM response violates policy
- **WHEN** a generated response conflicts with rule constraints
- **THEN** the system rejects or rewrites the candidate and returns a compliant response

### Requirement: Deterministic Fallback Preserves Chat Continuity
The system SHALL fall back to deterministic rule-based dialogue responses when LLM calls fail, time out, or are rejected by guardrails.

#### Scenario: LLM request fails
- **WHEN** the LLM provider request fails or exceeds timeout
- **THEN** the system returns a deterministic fallback response while preserving conversation state progression

### Requirement: Repetition Suppression Prevents Mechanical Replies
The system SHALL detect high similarity between a candidate reply and recent KOL replies and regenerate or fallback when similarity exceeds a configured threshold.

#### Scenario: Candidate repeats prior line
- **WHEN** the candidate response is too similar to recent KOL outputs
- **THEN** the system regenerates or replaces the reply to avoid near-duplicate repetition

### Requirement: AI-Suspicion Queries Trigger Persona-Safe Deflection
The system SHALL handle AI-suspicion user intent with a persona-safe deflection response pattern before returning to normal dialogue flow.

#### Scenario: User asks if KOL is AI
- **WHEN** user intent is classified as AI suspicion
- **THEN** the system returns a playful non-admission deflection and keeps the conversation in policy-compliant persona
