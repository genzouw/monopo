## 2024-05-05 - Unnecessary re-renders in React Components

**Learning:** `PlayerPanel`, `MiniMap`, and `FocusView` are consistently re-rendered by `GameBoard` when `animatingPosition` or `isRolling` states update. Specifically, the animation loop sets `animatingPosition` state every 300ms. Since `GameBoard` hosts the whole layout, these heavy components get re-rendered causing performance lag.
**Action:** Memoize pure UI components (`MiniMap`, `PlayerPanel`, `FocusView`) using `React.memo` so they only re-render if their exact props change, preventing them from re-rendering on parent animation ticks.
