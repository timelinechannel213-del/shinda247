## 2025-05-18 - Replacing Leaderboard REST Polling with WebSocket State

**Learning:** In real-time apps where WebSocket connections already track active bets (`activeBets`), components shouldn't issue frequent REST requests (e.g. 1.5s interval) to fetch player/leaderboard data. Deriving the UI state via `useMemo` from WebSocket state completely eliminates unnecessary server overhead.

**Action:** Whenever a component displays live player data, check if WebSocket state already contains the raw records before introducing a REST polling loop.
