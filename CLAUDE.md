<!--
  ⚠️ このファイルは自動生成されています。直接編集しないでください。
  対象ツール: Claude Code
  マスタ: docs/ai-guidelines.md
  同期: bun run sync:ai-guidelines
-->

# monopo AIコーディングガイドライン

> `docs/ai-guidelines.md` は AI コーディングアシスタント（Cursor / GitHub Copilot / Aider / Cline / Continue.dev / Trae 等）共通のマスタガイドラインです。
> 各 AI ツール固有の設定ファイル（`.cursorrules` / `.github/copilot-instructions.md` など）は `docs/ai-guidelines.md` から自動生成されます。
> 変更時はマスタファイル (`docs/ai-guidelines.md`) のみを編集し、`bun run sync:ai-guidelines` を実行して同期してください。

## 言語ルール

- ユーザーインターフェースのテキスト、ソースコードのコメント、プルリクエストの説明、およびプロジェクトのドキュメントファイルはすべて日本語で記述し、維持してください。
- 商標上の理由により、コードベース全体で「monopoly（モノポリ）」の代わりに「monopo（モノポ）」という名称を厳密に使用してください。

## 技術スタック

- フロントエンド: React, Vite, TypeScript, CSS Modules
- パッケージマネージャー / ランタイム: Bun (npm, yarn, pnpm は使用しないでください)

## コード品質とアーキテクチャ

- AIコードレビュー（PR-Agent / CodeRabbit など）のドックストリングカバレッジチェックを満たすため、新規または変更された関数やコンポーネントには適切なJSDocコメントを含めてください。
- AIツール関連のPRを作成する際は、タイトルを `chore(ai): 🤖 AIツール設定の最適化` などのフォーマットに従ってください。
- 動的なリストをレンダリングする際は、空の要素についての状態を明示してください。

## セキュリティ

- ゲームロジック（サイコロのロールやシャッフルなど）における安全な乱数生成には、`src/game/random.ts` でラップされた Web Crypto API（`crypto.getRandomValues()`）の `getSecureRandomInt` を使用してください。`Math.random()` は使用しないでください。
- `localStorage` から読み込まれるデータは信頼できない入力として扱います。アプリケーションの状態に適用する前に、構造を深く検証してください。

## テストと CI/CD

- PR Labeler (`actions/labeler`) を用いて、変更されたファイルパスに基づいて自動的にPRにラベルを付与する自動化を導入しています。これはパブリックリポジトリで無料で利用可能です。
- GitHub ActionsのCI/CDワークフローでは、`actions/setup-node` の代わりに `oven-sh/setup-bun` を利用して環境を構築してください。
- 乱数生成に依存するテストを作成または更新する際は、`Math.random()` の代わりに `src/game/random.ts` の `getSecureRandomInt` をモックしてください。
- GitHub Actions ワークフロー（`.github/workflows/**`）で外部 Action を参照する際は、必ず 40 桁のコミット SHA でピン留めし、可変ブランチ参照（`@main` / `@master` / `@develop` / `@trunk` / `@HEAD` 等）は使用しないでください。バージョン名は SHA の隣に行末コメントで併記してください（例: `uses: owner/repo@<40桁SHA> # v1.2.3`）。リポジトリリネームによる参照解決失敗（`startup_failure`）や、上流の不意な破壊的変更の取り込みを防ぐためです。既存の Action を更新する際は、コミット SHA とコメントを同時に書き換えてください。なお禁止対象のブランチ名一覧は `.github/workflows/actionlint.yml` の CI ガードと同期しているため、ガード側を更新した際は本ガイドラインも併せて更新してください。

## ツール・拡張機能

- Claude Code や OpenCode といった最新のAIコーディングツールを活用する際は、意図しない破壊的変更を避けるため、プレビュー機能を活用して差分を確認しながら適用してください。

- ローカルAIエージェントやAI-native IDE（Windsurf, Trae, Aider, Cline, Roo Code, Continue.devなど）を利用する際は、リポジトリ固有のルールを遵守し、作業ディレクトリ（`.aider*`、`.continue/`、`.windsurf`、`.roo/`、`.trae/` など）をコミットしないように注意してください。
- 本リポジトリでは無料・オープンソースのベストプラクティスに基づき、GitHub Models (gpt-4o-mini) を利用した自作の AI PR Reviewer を導入し、SaaS依存を低減しつつ高度なコードレビューを自動化しています。
- 最新のフロントエンド（React 19, Bun等）やAI CI/CDのトレンドを要約し、チームの継続的な学習を促進するための AI Weekly Tech Trend Analyzer (`.github/workflows/ai-tech-trend-analyzer.yml`) プロトタイプを導入しています。手動実行（`workflow_dispatch`）のみ可能です。**モデルIDは `gpt-4o-mini` に更新済みですが、GitHub Models 推論API自体が2026年7月30日付で退役したため、代替推論サービスへの移行が完了するまで動作しません（移行状況は Issue #573 で追跡）。**

- 最新のAIエージェント（GitHub Copilot Agent, GPT-5.5, Claude 3.7, DeepSeek-R1 連携等）を利用する際は、生成されたコードのセキュリティリスク（機密情報の出力やインジェクション脆弱性）をローカルで必ず検証し、自動レビューツールとの多層的なチェックを行ってください。

- 新たなAIツールやサービスを導入する際は、公開リポジトリにおいて無料で利用可能であることを前提としてください。また、それらを設定するための手動の事前作業（Secretsへのトークン追加など）は必ずプルリクエストの説明に記載してください。
- 開発進捗の要約や課題分析には、GitHub Models (gpt-4o-mini) と Tavily Search API を連携した自動プロジェクトマネジメントツール (`.github/workflows/ai-weekly-summary.yml`) を用意しています。利用にあたっては、リポジトリの Secrets に `GH_MODELS_TOKEN` と `TAVILY_API_KEY` の事前登録が必須です。**モデルIDは `gpt-4o-mini` に更新済みの一方、GitHub Models 推論API自体が2026年7月30日付で退役したため現在は動作を停止しています。再開には代替推論サービスへの移行が必要です（Issue #573 で追跡）。**
- `prompts/**` の変更時には promptfoo を用いたプロンプト評価 (`.github/workflows/ai-prompt-evaluator.yml`) が実行されます。**内部で GitHub Models (gpt-4o-mini) を呼び出していますが、GitHub Models 推論API自体が2026年7月30日付で退役したため、代替推論サービスへの移行が完了するまで評価ステップは `continue-on-error: true` によりソフト失敗として扱い、PRをブロックしません（移行状況は Issue #573 で追跡）。**

- `CLAUDE.md` は Claude Code 向けの設定ファイルとして自動生成されます。
