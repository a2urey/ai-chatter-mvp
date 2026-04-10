## Context

The project currently contains only a fresh OpenSpec setup, so this change will define the first end-to-end product slice. The requested experience is a conversion-first web page where prepared KOL media assets are used to establish trust quickly, an AI persona starts the interaction proactively, and the product pushes the user toward purchasing WhatsApp access within five dialogue turns.

This design needs to cover four concerns together: a persuasive landing experience, deterministic conversation control to protect the five-turn conversion goal, a lightweight MVP unlock gate that treats click as success, and an automated evaluation loop for persona quality and conversion behavior. Because the repository has no existing app architecture yet, the design should stay implementation-friendly and minimize early complexity.

## Goals / Non-Goals

**Goals:**
- Deliver a single-page chat-first landing experience that works well on mobile and desktop.
- Ensure the KOL persona can send the first message automatically on page load.
- Define a strong KOL persona through system prompt rules and few-shot examples.
- Constrain the conversation so the purchase CTA appears no later than the fifth KOL turn.
- Use a click-to-unlock MVP flow instead of real payment processing.
- Add an automated evaluation workflow that simulates fans, produces conversation logs, and scores persona consistency plus conversion performance.
- Capture enough analytics to measure each conversion step and support rapid optimization.

**Non-Goals:**
- Building a general-purpose chatbot platform for multiple creators.
- Implementing CRM, lead nurturing, or post-purchase lifecycle messaging.
- Supporting real payment providers in the first version.
- Delivering the actual WhatsApp contact through manual operations.

## Decisions

### 1. Use a chat-first landing page with KOL media framing

The page will be a single landing route with a prominent KOL card, proof-oriented media area, and an anchored chat pane. The opening viewport should make it obvious that the user is already in a live-feeling conversation instead of on a generic marketing page.

Why:
- This matches the user's desired interaction model.
- It shortens the time from visit to engagement.
- It lets the existing KOL media assets work as trust builders instead of secondary decoration.

Alternatives considered:
- A traditional sales page with a chat widget was rejected because it delays the conversation and weakens the "AI avatar talks first" effect.
- A full-screen messenger clone was rejected because it hides too much sales context and social proof.

### 2. Use a guided dialogue engine instead of unconstrained free-form chat

The first version will use a structured conversation plan made of stages such as hook, qualification, desire build, objection handling, and CTA. The dialogue engine will be grounded by a system prompt that defines who the KOL is, what topics or disclosures are forbidden, and several few-shot examples that demonstrate the intended sales style. An AI layer may generate the exact wording, but stage progression, turn limits, and CTA deadlines must be rule-driven.

Why:
- The product goal is a conversion outcome inside five turns, which is hard to guarantee with an unconstrained LLM.
- A stage model gives predictable analytics and easier iteration on prompts and copy.
- It allows us to personalize responses while still keeping the funnel on rails.

Alternatives considered:
- Pure scripted branching was rejected because it is too brittle for varied user replies.
- Pure LLM dialogue was rejected because it can drift, over-explain, or miss the CTA deadline.

### 3. Model the funnel as explicit A/B/C workflow states

The conversation controller will classify each session into three business states: A for casual rapport-building, B for emotional resonance or pain-point discovery, and C for conversion messaging. User replies should update the detected intent, and the controller must be able to force a transition into state C once enough context is gathered or the turn budget is nearly exhausted.

Why:
- This directly matches the task definition in the project brief.
- It gives the LLM a clearer operating frame than open-ended prompt chaining.
- It makes evaluation easier because state transitions can be inspected and scored.

Alternatives considered:
- A larger taxonomy with many micro-states was rejected for MVP because it adds tuning cost without clear first-version value.
- No explicit state labeling was rejected because it makes conversion timing harder to debug.

### 4. Model the conversation as explicit session state

Each visitor session will track message history, current dialogue stage, workflow state, turn count, CTA exposure, unlock intent, and unlock status. This state can live in the client for early rendering and sync to backend endpoints for logging and unlock fulfillment.

Why:
- The five-turn requirement depends on reliable counting and stage enforcement.
- Session state makes it possible to restore or resume a partially completed funnel.
- It creates a clean seam between UI, orchestration logic, analytics, and checkout handling.

Alternatives considered:
- Stateless prompt calls were rejected because they make turn guarantees and analytics less reliable.
- A backend-only session model was rejected for the first version because it adds latency to every chat interaction.

### 5. Use click-to-unlock fulfillment for the MVP

The product will present a conversion CTA when the dialogue hits its purchase stage. In the MVP, selecting that CTA is treated as a successful unlock event, and the UI immediately reveals the WhatsApp contact or an unlock screen without real payment verification.

Why:
- It matches the updated MVP requirement.
- It removes payment integration from the critical path.
- It still allows the team to validate whether the dialogue successfully drives unlock intent.

Alternatives considered:
- Building real payment processing now was rejected because it slows down validation of the funnel itself.
- Revealing the number on first page load was rejected because it would bypass the chat conversion loop entirely.

### 6. Add an automated evaluation harness before traffic

The project will include a scriptable evaluation harness that runs at least five full simulated chat sessions, with each simulation lasting up to ten turns. A second model or configurable simulated user persona should act as a skeptical fan. A judge prompt will score whether the KOL delivered the unlock link and whether any message broke persona rules.

Why:
- The task brief explicitly calls for machine-generated conversation logs and judge-based scoring.
- There are no real users yet, so evaluation needs to happen before launch.
- It creates a repeatable quality gate for prompt changes.

Alternatives considered:
- Manual QA only was rejected because it is too subjective and slow for prompt iteration.
- Pure unit testing without transcript review was rejected because it misses tone and persona failures.

### 7. Make analytics a first-class part of the funnel

The page and evaluation harness will emit events for page view, KOL greeting sent, first user reply, each turn transition, CTA shown, unlock click, unlock completion, and drop-off. These events should include session identifiers and dialogue stage metadata.

Why:
- The funnel will need rapid iteration on copy, pacing, and objections.
- Without event-level visibility, it will be hard to diagnose where users drop out before purchase.

Alternatives considered:
- Relying on page-level analytics only was rejected because it cannot explain conversation-level conversion failure.

## Risks / Trade-offs

- [Risk] Aggressive conversion pacing may feel spammy or artificial. -> Mitigation: keep the persona voice warm, vary copy by stage, and cap CTA repetition.
- [Risk] Five turns may be too short for skeptical users. -> Mitigation: require CTA exposure by turn five but allow post-CTA follow-up replies that still route back to checkout.
- [Risk] Click-to-unlock overstates real monetization potential. -> Mitigation: treat MVP unlock rate as a proxy metric and keep the unlock boundary abstract so payment can be inserted later.
- [Risk] Early overuse of AI generation can create inconsistent claims. -> Mitigation: keep offer details, pricing, and purchase CTAs template-driven and non-generative.
- [Risk] The persona may drift even with prompts and few-shots. -> Mitigation: add evaluation criteria that explicitly flag out-of-character lines and keep forbidden topics in the system prompt.
- [Risk] There is no confirmed tech stack yet. -> Mitigation: keep the architecture modular so the landing page, dialogue engine, and checkout adapter can be implemented with a lightweight frontend stack.

## Migration Plan

1. Introduce the landing page shell and local session model.
2. Add the guided dialogue engine with seeded KOL media/config content, system prompt rules, and few-shot examples.
3. Implement click-to-unlock fulfillment for WhatsApp access.
4. Connect analytics events to the conversation lifecycle.
5. Add the automated evaluation harness and review generated transcripts before traffic.
6. Soft launch with internal validation before running paid traffic.

Rollback strategy:
- Disable unlock CTA exposure and replace it with a waitlist or unavailable state if fulfillment is unstable.
- Fall back from AI-generated copy to static scripted dialogue if response quality or pacing is poor.

## Open Questions

- Should WhatsApp access be revealed directly in the chat transcript or in a separate unlock card after click?
- Does the KOL offer only one unlockable contact product, or will packages vary by campaign?
- Should the first version support multilingual dialogue, or only a single campaign language?
