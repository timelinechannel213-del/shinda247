## 2025-05-20 - Throttling WebSocket State Updates During High-Frequency Animation Loops

**Learning:** Running `setGameState` at 60Hz inside `requestAnimationFrame` forces top-level component trees to re-render 60 times per second, creating massive CPU and render overhead across the entire application. Throttling React state updates to ~100ms (~10Hz) reduces re-renders by ~83% while keeping high-frequency animation components smooth via ref-based RAF loops.

**Action:** Decouple high-frequency (~60Hz) animations from React state by updating internal state refs (`elapsedRef`, `flyStartRef`) at 60Hz and throttling top-level React state setters (`setGameState`) to ~10Hz.
