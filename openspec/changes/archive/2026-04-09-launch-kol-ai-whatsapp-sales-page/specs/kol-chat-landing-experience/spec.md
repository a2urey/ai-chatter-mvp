## ADDED Requirements

### Requirement: Chat Landing Loads as the Primary Experience
The system SHALL render a chat-first landing page where the KOL identity, prepared media assets, and active conversation area are visible on initial load without requiring the user to navigate to a secondary screen.

#### Scenario: User lands on the page
- **WHEN** a visitor opens the campaign URL
- **THEN** the page shows the KOL identity, supporting media, and a chat interface in the initial experience

### Requirement: KOL Persona Starts the Conversation Automatically
The system SHALL append and display the KOL AI persona's opening message automatically on page load before the user sends a message.

#### Scenario: Auto greeting is sent
- **WHEN** the page finishes its initial render
- **THEN** the first visible chat message is authored by the KOL AI persona without user action

### Requirement: Landing Experience Must Be Mobile Optimized
The system SHALL keep the KOL media summary, chat history, message composer, and primary purchase CTA accessible on mobile-width viewports without horizontal scrolling.

#### Scenario: User visits on mobile
- **WHEN** the page is rendered on a narrow viewport
- **THEN** the user can view the conversation, enter a reply, and reach the CTA without layout breakage or horizontal scrolling

### Requirement: Landing Funnel Events Are Captured
The system SHALL emit trackable events for page view, auto greeting rendered, first user reply, and CTA exposure for each visitor session.

#### Scenario: Visitor interacts with the landing page
- **WHEN** a user loads the page and replies to the KOL persona
- **THEN** the system records the landing and early engagement events with the associated session identifier
