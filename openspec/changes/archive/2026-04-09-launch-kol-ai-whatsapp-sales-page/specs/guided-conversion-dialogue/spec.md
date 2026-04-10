## ADDED Requirements

### Requirement: Dialogue Flow Must Reach a Purchase Prompt Within Five KOL Turns
The system SHALL advance each new session through a guided dialogue flow that exposes a purchase-oriented call to action no later than the fifth KOL-authored message, including the opening greeting.

#### Scenario: Conversation reaches CTA on time
- **WHEN** a user participates in a new chat session
- **THEN** the system presents a purchase-oriented CTA by or before the fifth KOL-authored message

### Requirement: Dialogue Must Adapt to User Intent While Staying on Funnel Rails
The system SHALL classify user replies into supported intent categories such as curiosity, pricing interest, hesitation, and objection, and respond with stage-appropriate messaging without losing the five-turn CTA deadline.

#### Scenario: User asks a question before the CTA
- **WHEN** the user replies with a pricing or trust-related question
- **THEN** the system answers with stage-appropriate copy and continues progressing toward the CTA deadline

### Requirement: Offer Claims and CTA Copy Must Use Controlled Content
The system SHALL source offer details, pricing references, and purchase CTAs from controlled campaign content rather than allowing unconstrained generated claims.

#### Scenario: Dialogue references the offer
- **WHEN** the conversation introduces the paid WhatsApp access
- **THEN** the message uses campaign-approved offer details and CTA language

### Requirement: Dialogue Progress Must Be Observable
The system SHALL record each KOL turn, detected user intent, stage transition, and CTA render event for every chat session.

#### Scenario: User moves through the funnel
- **WHEN** the conversation progresses from greeting through CTA exposure
- **THEN** the system records the sequence of turns and funnel stages for analysis
