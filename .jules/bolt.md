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

## 2024-11-20 - リスト描画における O(N) 配列スキャンを O(1) 辞書ルックアップに置き換える

**Learning:** コンポーネントのリスト（例: `MiniMap` のボードマス）を描画する際、子コンポーネントに配列全体（`allPlayers`）を渡して子の描画関数や `React.memo` の等価チェック内で O(N) の `.find()` ルックアップを行うと、O(N) の操作が N 回実行され O(N²) となる深刻なパフォーマンスボトルネックになる。また、頻繁に呼ばれる UI ヘルパー（`getSpaceLabel` など）で `.filter(Boolean).join(' ')` のような配列リテラルを使用すると、不要なガベージコレクションのオーバーヘッドが発生する。
**Action:** 親コンポーネントで `useMemo` を使って O(1) のルックアップ辞書（`playersById` など）を事前に計算し、子コンポーネントには特定のエンティティ（`owner` など）のみをプロパティとして渡すこと。ホットパスでは中間配列の割り当てやチェーン操作を避け、標準的な文字列結合またはテンプレートリテラルに置き換えること。
