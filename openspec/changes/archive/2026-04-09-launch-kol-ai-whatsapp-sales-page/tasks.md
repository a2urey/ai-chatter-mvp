## 1. Project Setup

- [x] 1.1 Scaffold the web app entry point, routing, and baseline page structure for the KOL chat landing experience
- [x] 1.2 Define campaign configuration models for KOL identity, media assets, system prompt rules, forbidden behaviors, few-shot examples, and WhatsApp unlock data
- [x] 1.3 Add shared session state primitives for message history, dialogue stage, workflow state, turn count, CTA exposure, unlock state, and unlock completion status

## 2. Landing Experience

- [x] 2.1 Build the chat-first landing layout with KOL profile/media framing and a responsive conversation panel
- [x] 2.2 Implement automatic KOL greeting on initial page load and render it as the first chat message
- [x] 2.3 Ensure the landing page remains usable on mobile-width screens without horizontal scrolling or hidden primary actions

## 3. Guided Conversion Dialogue

- [x] 3.1 Implement the guided dialogue engine with A/B/C workflow states for ice-breaking, pain-point discovery, and conversion
- [x] 3.2 Add user-intent classification and response selection that preserves the requirement to expose the purchase CTA by the fifth KOL turn
- [x] 3.3 Restrict offer details, pricing references, and CTA copy to campaign-controlled content instead of unconstrained generated output
- [x] 3.4 Write the KOL system prompt and few-shot examples that preserve persona and forbid disallowed disclosures or topics

## 4. Unlock Flow

- [x] 4.1 Add the in-chat conversion CTA and connect it to the MVP unlock action
- [x] 4.2 Implement click-to-unlock session handling with explicit unlock-state updates and no real payment dependency
- [x] 4.3 Implement WhatsApp contact reveal behavior that only appears after the unlock click succeeds

## 5. Analytics and Evaluation

- [x] 5.1 Emit analytics events for landing, greeting, first reply, turn progression, CTA exposure, unlock click, unlock completion, and drop-off
- [x] 5.2 Build an automated evaluation script that runs at least 5 simulated fan conversations for up to 10 turns each
- [x] 5.3 Add judge-based scoring that counts successful link drops and flags any persona-breaking lines
- [x] 5.4 Save the generated evaluation transcripts and review them against the spec before launch
