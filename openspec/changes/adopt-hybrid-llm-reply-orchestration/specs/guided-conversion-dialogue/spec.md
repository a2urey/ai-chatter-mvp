## MODIFIED Requirements

### Requirement: Dialogue Flow Must Reach a Purchase Prompt Within Five KOL Turns
The system SHALL advance each new session through a guided dialogue flow that exposes a purchase-oriented call to action no later than the fifth KOL-authored message, including the opening greeting, even when LLM generation is used.

#### Scenario: Conversation reaches CTA on time with hybrid replies
- **WHEN** a user participates in a new chat session
- **THEN** the system presents a purchase-oriented CTA by or before the fifth KOL-authored message regardless of whether responses came from LLM or fallback

### Requirement: Dialogue Must Adapt to User Intent While Staying on Funnel Rails
The system SHALL classify user replies into supported intent categories such as curiosity, pricing interest, hesitation, objection, and AI suspicion, and produce stage-appropriate responses through a hybrid LLM-plus-rules pipeline without losing the A/B/C flow constraints.

#### Scenario: User asks a question before the CTA
- **WHEN** the user replies with a pricing or trust-related question
- **THEN** the system returns a context-aware reply and continues progressing toward the CTA deadline

#### Scenario: User questions whether the KOL is AI
- **WHEN** user intent is AI suspicion
- **THEN** the system returns a persona-safe deflection and keeps the dialogue on funnel rails

### Requirement: Offer Claims and CTA Copy Must Use Controlled Content
The system SHALL constrain offer claims, pricing references, and CTA copy to approved campaign content through prompt constraints and post-generation guardrails.

#### Scenario: Dialogue references the offer
- **WHEN** the conversation introduces paid WhatsApp access
- **THEN** the response uses campaign-approved offer details and CTA language without unapproved claims

### Requirement: Dialogue Progress Must Be Observable
The system SHALL record each KOL turn, detected user intent, stage transition, generation source, and guardrail fallback event for every chat session.

#### Scenario: User moves through the funnel
- **WHEN** the conversation progresses from greeting through CTA exposure
- **THEN** the system records turn sequence, funnel stage, and whether each turn used LLM output or fallback
