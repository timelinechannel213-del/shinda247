## 2025-05-18 - Pause inactive tab polling in HistoryPanel

**Learning:** Components polling endpoints on continuous timers (e.g., `setInterval`) create unnecessary network traffic and backend/CPU load when their respective UI tabs are inactive.

**Action:** Always check the active tab or visible state before initiating polling intervals in tabbed interface components, and memoize statistics derived from state arrays using `useMemo`.
