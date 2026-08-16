## 2025-08-16 - Decoupling High-Frequency Socket Multiplier Updates from React State

**Learning:** Running a 60 FPS `requestAnimationFrame` loop inside `useGameSocket` that calls `setGameState` triggers component tree re-renders across the whole application on every frame (~60 re-renders/sec). Downstream components (`GameCanvas`, `GameControls`) can instead consume a shared `flyStartRef` and update high-frequency text nodes directly via DOM ref manipulation (`element.textContent`), while using `useLayoutEffect` to resync DOM content on state changes to eliminate flickering.

**Action:** When working with high-frequency continuous values (60 FPS game tickers, sliders, animations), pass ref objects containing timing/state data down to rendering components and update DOM text/attributes directly instead of storing high-frequency values in top-level React state.
