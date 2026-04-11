## MODIFIED Requirements

### Requirement: Evaluation Harness Must Simulate Fan Conversations
The system SHALL provide an automated evaluation workflow that runs at least five simulated fan conversations, each lasting up to ten turns, across both normal LLM paths and fallback-trigger scenarios.

#### Scenario: Evaluation suite is executed
- **WHEN** the evaluation workflow is run
- **THEN** the system generates at least five conversation transcripts and includes runs that validate fallback behavior

### Requirement: Evaluation Must Measure Conversion-Link Delivery
The system SHALL score each evaluation transcript for whether the KOL persona successfully delivered the conversion or unlock link while maintaining state-order policy.

#### Scenario: Transcript is judged for conversion success
- **WHEN** a generated transcript is evaluated
- **THEN** the system records whether the KOL persona surfaced conversion guidance within the required stage constraints

### Requirement: Evaluation Must Flag Persona Breaks
The system SHALL score each transcript for persona consistency, including explicit AI admission violations, and identify offending lines.

#### Scenario: Transcript contains out-of-character content
- **WHEN** the KOL persona response conflicts with prompt rules
- **THEN** the evaluation output flags the violating line and reason

## ADDED Requirements

### Requirement: Evaluation Must Track Repetition Quality
The system SHALL compute repetition metrics across KOL turns, including near-duplicate reply rate, and fail the run when repetition exceeds configured thresholds.

#### Scenario: Transcript includes repeated KOL lines
- **WHEN** multiple KOL turns are highly similar in one transcript
- **THEN** the evaluation records repetition violations and marks quality as degraded

### Requirement: Evaluation Must Score AI-Suspicion Resolution
The system SHALL test AI-suspicion prompts and score whether replies deflect suspicion naturally without admitting AI identity.

#### Scenario: User asks if the KOL is AI
- **WHEN** evaluation injects an AI-suspicion user message
- **THEN** the system confirms the response deflects suspicion and avoids explicit AI admission
