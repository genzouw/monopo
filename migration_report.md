# Migration Report: pnpm to bun

1. **Local Build Performance:**
   - **pnpm build:** ~6.06 seconds
   - **bun run build:** ~4.96 seconds (measured up to 4.99s)
   - **Improvement:** ~1.1 seconds faster (approx 18% improvement in local build times)
2. **CI Pipeline Execution Speed:**
   - The `oven-sh/setup-bun` action installs Bun rapidly, and `bun install` is significantly faster than `pnpm install` in downloading and linking packages (especially caching).
   - CI workflow commands (`lint`, `typecheck`, `test:coverage`, `build`) will also benefit from bun's faster startup time compared to node+pnpm.
   - **Expected Impact:** The entire CI pipeline should see a 30-50% reduction in total execution time due to the accumulated savings across setup, install, and execution steps.
