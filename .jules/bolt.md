## 2025-05-18 - Eliminating REST Polling with Real-Time WebSocket State
**Learning:** Polling REST endpoints (e.g., `/api/game/players`) at high frequency (1.5s) when the exact data is already being broadcast and tracked over an active WebSocket connection causes unnecessary network I/O (~40 requests/min) and redundant React re-renders.
**Action:** Always check if existing WebSocket state or parent coordinator state can be leveraged via props and derived with `useMemo`, falling back to REST only if unsupplied.
