## 2025-02-23 - Decoupling High-Frequency Rocket Flight Updates from React Rendering State

**Learning:** High-frequency updates in real-time games (like 60fps tickers for rocket flight/multiplier) trigger massive, cascading React re-render cycles across the entire component tree if they are coupled directly to React component state. In Shinda, having the socket loop trigger `setGameState` at 60fps and local rocket position hooks also calling `setRocketPos` at 60fps led to unnecessary CPU usage, main thread blockages, and potential frame drops.

By separating high-frequency visual updates from React declarative state, we can keep the component tree light and extremely fast:
1. The WebSocket connection only triggers discrete state transitions (waiting, betting, flying, crashed).
2. The 60fps animation tick (`requestAnimationFrame`) is handled directly in DOM manipulation via `useRef` (e.g., updating rocket positioning styles and text content of multiplier/cashout values directly).
3. `useLayoutEffect` is utilized to re-apply manual DOM updates immediately following any React state transition to completely prevent UI flickers or visual "snapping" to stale initial JSX values.

**Action:** Whenever implementing features with fast-updating values (animations, real-time counters, socket tickers), offload the high-frequency updates to standard `useRef` and direct DOM style/text property manipulations. Use React state purely for discrete state changes and layout structural shifts, and coordinate them via `useLayoutEffect` after render to ensure seamless synchrony.
