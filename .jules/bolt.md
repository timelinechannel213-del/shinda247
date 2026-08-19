## 2025-05-18 - Decoupling 60fps Ticker from React State in Rocket Crash Game
**Learning:** Calling React state setters (`setGameState`) at 60fps in WebSocket / RAF loops causes full component re-render trees (Home -> Canvas, Controls, Topbar, Sidebars) on every frame, consuming significant CPU/GPU resources and causing visual stuttering/flicker.
**Action:** Decouple 60fps updates from React state by storing elapsed time in a `useRef` (`flyStartRef`) and directly updating DOM element text and CSS transforms via RAF in child components, re-syncing via `useLayoutEffect` on React re-renders.
