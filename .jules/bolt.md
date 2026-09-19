## 2025-05-18 - Replacing Leaderboard HTTP Polling with WebSocket State
**Learning:** In real-time apps where a WebSocket connection already receives high-frequency domain state (e.g., active bets/players), panel components like `RightSidebar` that poll identical HTTP endpoints (e.g. `/api/game/players` every 1.5s) introduce unnecessary network overhead (40 HTTP requests/min per client).
**Action:** Always check if WebSocket state can be passed as props to panel components to derive UI state via `useMemo`, falling back to HTTP polling only when the prop is undefined.
