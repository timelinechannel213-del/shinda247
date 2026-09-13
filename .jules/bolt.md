## 2025-05-10 - Layout component memoization for high-frequency parent views

**Learning:** Static layout and side panel components (`Sidebar`, `Topbar`, `RightSidebar`, `BottomNav`, `HistoryPanel`) in real-time applications suffer unnecessary re-renders when parent views (`Home`) update state on game socket events or tick updates.
**Action:** Always wrap non-frequently updating layout/sidebar components in `React.memo` to eliminate unnecessary re-renders.
