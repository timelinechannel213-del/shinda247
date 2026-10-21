## 2025-05-18 - Leaderboard websocket state derivation
**Learning:** The `RightSidebar` component polled `/api/game/players` every 1,500ms via REST while the active bet state was already being received in real time over WebSockets via `useGameSocket`. Deriving leaderboard rankings in memory via `useMemo` from `activeBets` eliminates redundant HTTP traffic entirely.
**Action:** When component state duplicates real-time WebSocket state, derive values locally with `useMemo` instead of setting up REST polling intervals.
