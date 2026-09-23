## 2025-05-20 - Tab-Gated Polling and Memoization in HistoryPanel
**Learning:** Polling background REST endpoints in UI panels without checking active tab visibility wastes network requests and triggers redundant state updates when the user is interacting with non-visible tabs (e.g. Support or My Bets).
**Action:** Always check `activeTab` or component visibility inside `useEffect` before setting up polling intervals for panel-specific endpoints.
