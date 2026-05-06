## 2024-05-05 - Unnecessary re-renders in React Components

**Learning:** `PlayerPanel`, `MiniMap`, and `FocusView` are consistently re-rendered by `GameBoard` when `animatingPosition` or `isRolling` states update. Specifically, the animation loop sets `animatingPosition` state every 300ms. Since `GameBoard` hosts the whole layout, these heavy components get re-rendered causing performance lag.
**Action:** Memoize pure UI components (`MiniMap`, `PlayerPanel`, `FocusView`) using `React.memo` so they only re-render if their exact props change, preventing them from re-rendering on parent animation ticks.

## 2024-05-18 - MiniMap spaces rendering bottleneck during animation

**Learning:** During dice roll animations, the `players` array prop passed to `MiniMap` updates its reference on every tick (300ms) to reflect the moving player's intermediate positions. Because `MiniMap` iterated over 40 spaces to render them inline, all 40 spaces re-rendered on every single animation frame, which is inefficient.
**Action:** Extract large list items or grid elements (like board spaces) into individual `React.memo` components with custom comparison functions (`areEqual`). For `MemoizedMiniSpace`, checking if the subset of players present on that specific space actually changed avoids re-rendering the other 38 unchanged spaces.
