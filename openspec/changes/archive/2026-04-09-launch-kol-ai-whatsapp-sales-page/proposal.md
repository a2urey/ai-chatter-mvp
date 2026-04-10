## Why

KOL media assets are already prepared, but there is no conversion-focused landing experience that turns cold traffic into paying users. We need a lightweight web page where a KOL AI persona proactively starts a chat, stays in character, builds desire within five turns, and converts the user into clicking to unlock the KOL's WhatsApp contact in the MVP.

## What Changes

- Add a single-page, mobile-first chat landing experience centered on a KOL AI persona.
- Make the AI persona proactively send the opening message as soon as the page loads, without waiting for user input.
- Introduce a guided conversation system with persona prompt, few-shot examples, and intent-aware state transitions that steer the user toward a conversion decision within five back-and-forth turns.
- Add an MVP unlock entry point where clicking the conversion CTA is treated as a successful unlock, without requiring real payment processing.
- Add an automated evaluation loop that runs simulated fan conversations, scores persona consistency and conversion success, and stores the generated dialogue logs for review.
- Provide conversion-state tracking so the product can measure greeting exposure, reply rate, five-turn completion, unlock clicks, and unlock completion.

## Capabilities

### New Capabilities
- `kol-chat-landing-experience`: A landing page that presents the KOL AI persona, its media assets, and a chat-first interface optimized for mobile traffic.
- `guided-conversion-dialogue`: A proactive conversation flow that opens automatically, adapts to user replies, and escalates toward a conversion CTA within five turns.
- `whatsapp-access-unlock`: An MVP unlock flow that reveals or delivers the KOL WhatsApp contact immediately after the user clicks the conversion CTA.
- `dialogue-evaluation`: An automated evaluation workflow that simulates fan conversations, measures conversion-link delivery, and flags persona breaks.

### Modified Capabilities

None.

## Impact

- Adds a new frontend landing page and chat UI flow.
- Requires AI prompt configuration, conversation orchestration, and a turn counter/state model.
- Requires secure but lightweight post-click fulfillment for WhatsApp access in the MVP.
- Requires automated dialogue simulation and judge-based evaluation outputs.
- Requires product analytics/events for funnel measurement and optimization.
