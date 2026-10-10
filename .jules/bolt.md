## 2026-06-05 - Derive Leaderboard from WebSocket Active Bets State
**Learning:** In `RightSidebar`, continuous REST polling (`/api/game/players` every 1.5s) created 40 redundant HTTP requests/min per connected client, even though WebSocket already broadcasts `activeBets` in real time.
**Action:** Pass `activeBets` state from `useGameSocket` down via `home.tsx` to `RightSidebar`, deriving and sorting entries with `useMemo` to eliminate polling when connected.
