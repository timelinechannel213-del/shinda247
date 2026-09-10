## 2025-05-10 - Event-driven history fetch with relaxed polling
**Learning:** In Topbar, polling `/api/game/history` every 5 seconds created excessive unneeded network requests during active flight phases when game history remains unchanged.
**Action:** Increase background polling interval to 15s and supplement it with an event-driven `useEffect` listener on `gameState.phase === 'crashed'` to immediately fetch new history as soon as a round ends.
