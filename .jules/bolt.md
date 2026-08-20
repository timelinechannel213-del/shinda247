## 2025-05-18 - Memoize Static Layout Components in High-Frequency Game Loops

**Learning:** When a root page component (e.g. `Home`) receives high-frequency 60fps socket or `requestAnimationFrame` state updates, non-memoized child layout components (`Sidebar`, `Topbar`, `RightSidebar`, `HistoryPanel`, `BottomNav`) re-render on every frame (~300 component re-renders/sec), causing severe VDOM reconciliation overhead even if their props haven't changed. Passing unused reactive state props (like `gameState` to `Topbar`) also forces child re-renders.

**Action:** Always wrap static/panel components in `React.memo`, remove unused reactive props from parent JSX call-sites, and use `useMemo` for internal array reduce/sorting calculations so 60fps game loops only re-render components that directly consume animated frame data.
