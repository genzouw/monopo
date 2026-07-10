
## 2025-02-12 - Prevent O(N log N) during high-frequency renders
**Learning:** In the `monopo` React app, game board animations (e.g., dice rolls) trigger high-frequency (60 FPS) re-renders in `GameBoard.tsx`. Inline calculations inside IIFEs (like mapping and sorting player properties) will bypass normal React rendering optimizations and execute on every animation frame if the parent dialog state is active, causing severe layout thrashing.
**Action:** Extract all expensive derived state calculations (e.g., array `.map().sort()`) out of render paths or IIFEs into top-level `useMemo` hooks with strict dependencies to ensure they only recalculate when the underlying data changes, not on every frame update.
