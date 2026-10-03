## 2025-05-20 - Throttling WebSocket RAF React State Updates in Rocket Crash Game

**Learning:** High-frequency React `setGameState` calls triggered on every `requestAnimationFrame` frame (60fps) inside a custom hook like `useGameSocket` cause continuous re-renders across all consumer components. Since canvas/rocket animations run on internal RAF loops, throttling React state updates during flight to ~100ms (~10Hz) eliminates ~83% of component tree re-renders without affecting smooth visual performance.

**Action:** Maintain a decoupled ref (`elapsedRef`) updated at 60Hz for sub-components using direct DOM/Canvas animation, while throttling React state setters using `Date.now()` timestamp checks.
