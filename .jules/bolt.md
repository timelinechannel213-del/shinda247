## 2026-11-01 - Eliminate REST Polling for RightSidebar Leaderboard
**Learning:** The `RightSidebar` leaderboard component was aggressively polling `/api/game/players` every 1.5 seconds (40 requests/min) despite the active round's bet data already being streamed in real time via WebSocket (`activeBets` in `useGameSocket`).
**Action:** When WebSocket state streams real-time data, pass it directly down to side panels and memoize sorting with `useMemo`, conditionally disabling background REST polling intervals.
