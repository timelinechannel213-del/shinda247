## 2025-05-20 - Replace REST Polling for Dynamic Sidebar Data with WebSocket Driven Props

**Learning:** Components polling REST endpoints at high frequencies (e.g. `RightSidebar` polling `/api/game/players` every 1.5s) generate significant unnecessary HTTP overhead (~40 req/min) when the exact underlying data (`activeBets`) is already streamed live via WebSockets to parent views.
**Action:** Always check if active state stream from `useGameSocket` or global Context contains the data required for sidebars/panels, and derive derived UI views using `useMemo` instead of polling REST APIs.
