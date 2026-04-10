## ADDED Requirements

### Requirement: Evaluation Harness Must Simulate Fan Conversations
The system SHALL provide an automated evaluation workflow that runs at least five simulated fan conversations, with each conversation lasting up to ten turns between the KOL persona and a simulated skeptical fan.

#### Scenario: Evaluation suite is executed
- **WHEN** the evaluation workflow is run
- **THEN** the system generates at least five full conversation transcripts with turn-by-turn dialogue

### Requirement: Evaluation Must Measure Conversion-Link Delivery
The system SHALL score each evaluation transcript for whether the KOL persona successfully delivered the conversion or unlock link during the conversation.

#### Scenario: Transcript is judged for conversion success
- **WHEN** a generated transcript is evaluated
- **THEN** the system records whether the KOL persona successfully surfaced the conversion link

### Requirement: Evaluation Must Flag Persona Breaks
The system SHALL score each evaluation transcript for persona consistency and identify any lines that violate the configured persona rules or forbidden behaviors.

#### Scenario: Transcript contains out-of-character content
- **WHEN** the KOL persona says something that conflicts with its configured prompt rules
- **THEN** the evaluation output flags the offending line as a persona break
