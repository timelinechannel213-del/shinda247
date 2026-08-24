## 2025-08-24 - React.memo for static side panels during 60fps ticker state updates
**Learning:** High-frequency updates triggered by parent component state (e.g. WebSocket 60fps RAF ticker) propagate unnecessary re-renders to non-frequently changing children like `HistoryPanel`.
**Action:** Always wrap static/low-frequency child components in `React.memo` when rendered inside pages or views containing high-frequency state tickers.
