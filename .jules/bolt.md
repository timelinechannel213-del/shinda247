## 2025-09-22 - Leaderboard WebSocket Integration
**Learning:** `RightSidebar` was polling `/api/game/players` every 1,500ms even though `useGameSocket` already maintains real-time bet state (`activeBets`) via WebSocket.
**Action:** Deriving leaderboard data directly from `activeBets` with `useMemo` completely eliminates 40 REST polling requests per minute per active client.
