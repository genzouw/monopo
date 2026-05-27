# 2024-06-25 - Prevent O(N) array scans during React renders with direct index access and getSpaceById cache

**Learning:** The `BOARD_SPACES` array is strictly ordered by position (0-39). Finding spaces by position using `.find(s => s.position === position)` creates an O(N) lookup that runs frequently during renders and game logic updates. Similarly, looking up spaces by ID via `.find(s => s.id === id)` requires full array traversal, despite a `getBoardCache` (`getSpaceById`) mechanism already existing in `src/game/rules.ts` that provides O(1) performance via a `WeakMap`.
**Action:** Always use direct index access (e.g., `BOARD_SPACES[position]`) when looking up spaces by their position. When looking up by ID, always use `getSpaceById(id, BOARD_SPACES)` to leverage the existing `WeakMap` cache.

## 2024-05-15 - Migrate from pnpm to bun

**Learning:** Using `bun` instead of `pnpm` and `node` reduces build times and simplifies toolchain configurations, especially in CI environments where `actions/setup-node` and `pnpm/action-setup` can be replaced by a single `oven-sh/setup-bun` action. Note that `bun audit` was only added in bun 1.2.21 and does not yet fully analyse the new text-form lockfile (`bun.lock`), so CVE scanning is delegated to Dependabot until `bun audit` matures. `bun pm untrusted` is for listing packages with blocked lifecycle scripts, not for CVE scanning.
**Action:** For future Node to Bun migrations, comprehensively update all package manager references across configuration files (`package.json`), lockfiles (`bun.lock`), documentation (`README.md`, `CONTRIBUTING.md`), and CI workflows (`ci.yml`, `deploy.yml`), ensuring that workflow node setup steps are safely removed and that an appropriate security scanning path (Dependabot today, `bun audit` once it covers `bun.lock`) is in place.

## 2024-05-21 - Replace O(N) Array Iteration with Precomputed O(1) BoardCache Lookup in findNearestSpace

**Learning:** `findNearestSpace` was using `board.filter((s) => s.type === spaceType)` every time a player drew a card that moved them to the nearest railroad or utility. This forced an O(N) scan allocating a new array over all 40 board spaces. However, the existing `getBoardCache` `WeakMap` already computes `byType` and stores the IDs in board index order, enabling O(1) retrieval of targets and eliminating the intermediate array entirely.
**Action:** Always prefer retrieving pre-computed lists (e.g., `cache.byType`) from `getBoardCache` when querying spaces by type, and map them to spaces via `cache.byId` in O(1) time instead of using `.filter()` on the raw `board` array.

## 2024-08-16 - Eliminate intermediate array allocations during O(N) game rule loops

**Learning:** Core game rules that scan arrays (like `calculateRent`, `canBuildHouse`, and `canSellHouse`) run frequently across multiple components during both React renders and Redux-like action dispatches. Utilizing functional array spread patterns like `Math.max(...group.map(...))` or `.filter(...).length` allocates temporary arrays repeatedly, which degrades performance and triggers unnecessary garbage collection under load.
**Action:** Always replace chained functional array operations like `.map()`, `.some()`, and array spreading with explicit `for...of` loops and accumulator variables (e.g. `minHouses`, `ownedRailroads`) when checking rules or properties against groups.

## 2024-10-25 - 頻繁な評価処理で .some や .every などの配列メソッドを避ける

**Learning:** コアゲームルール評価（例: `ownsFullColorGroup`, `canMortgage`, `validateTradeOffer`）において、`.every` や `.some` などの関数型配列メソッドを使用すると、一時的な関数と配列が割り当てられ、React レンダーやアクションディスパッチなどの頻繁な評価時に中間的なアロケーションが発生し、ガベージコレクションに悪影響を与えます。
**Action:** プロパティのチェックやコアゲームルールの評価を行う際は、`.every` や `.some` のようなチェーン操作を常に明示的な `for...of` ループとアキュムレータ/フラグ変数に置き換えてください。

## 2024-11-20 - Replace O(N) array scans in list renders with O(1) dictionary lookups

**Learning:** When rendering lists of components (e.g., board spaces in `MiniMap`), passing entire arrays (`allPlayers`) to child components and performing O(N) `.find()` lookups inside the child's render function and `React.memo` equality checks creates a significant performance bottleneck ($O(N)$ operations invoked $N$ times, resulting in $O(N^2)$). Additionally, using array literals with `.filter(Boolean).join(' ')` in frequently executed UI helpers (like `getSpaceLabel`) introduces unnecessary garbage collection overhead.
**Action:** Always precompute O(1) lookup dictionaries (like `playersById`) in the parent using `useMemo` and pass only the specific entity (e.g., `owner`) to the child component as a prop. Replace intermediate array allocations and chained methods in hot paths with standard string concatenation or template literals.
