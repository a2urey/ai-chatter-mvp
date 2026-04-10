export function createAnalyticsTracker(sessionId) {
  const events = [];

  function track(eventName, payload = {}) {
    const event = {
      eventName,
      sessionId,
      timestamp: new Date().toISOString(),
      payload
    };

    events.push(event);
    try {
      const key = `kol-mvp-events-${sessionId}`;
      const previous = JSON.parse(localStorage.getItem(key) || "[]");
      previous.push(event);
      localStorage.setItem(key, JSON.stringify(previous));
    } catch (_error) {
      // Ignore localStorage failures in restricted environments.
    }
    console.log("[analytics]", eventName, event);
  }

  function listEvents() {
    return [...events];
  }

  return { track, listEvents };
}
