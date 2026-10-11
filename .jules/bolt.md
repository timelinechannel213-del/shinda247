## 2025-05-18 - Eliminate REST Polling for RightSidebar Leaderboard

**Learning:** Component `RightSidebar` polled `/api/game/players` every 1.5 seconds via `setInterval` despite the WebSocket hook `useGameSocket` already maintaining and broadcasting `activeBets` in real-time. Passing `activeBets` from `Home` and computing leaderboard entries with `useMemo` completely eliminates 40 REST polling HTTP requests/min while rendering leaderboard changes instantaneously.

**Action:** Before implementing REST polling or periodic timers for UI components, verify whether real-time data streams (e.g. WebSockets) are already active and available in parent component state.
