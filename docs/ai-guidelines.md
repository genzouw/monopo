# monopo AIコーディングガイドライン

## 最重要原則: 完全無料の SaaS・AI・ツールのみを利用する (MUST)

本リポジトリは公開 OSS です。CI/CD および自動化ワークフローに組み込んでよいのは、**公開 OSS リポジトリで完全無料 (課金が一切発生しない) な SaaS / AI / ツールのみ** です。

- **禁止**: LLM プロバイダの API キーを GitHub Secrets に登録し、CI から呼び出す構成の追加。
  `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `CLAUDE_API_KEY` / `MISTRAL_API_KEY` / `GROQ_API_KEY` / `DEEPSEEK_API_KEY` / `PERPLEXITY_API_KEY` などが該当します。
- **禁止**: 従量課金の検索 API (`TAVILY_API_KEY` / `EXA_API_KEY` / `SERPAPI_KEY` 等) の CI 組み込み。
- **禁止**: 「無料枠に収まる前提」での従量課金 API 利用。レート制限超過で課金が始まる構造そのものを禁止します。
- **禁止**: 有料プラン / 有料トライアル / クレジットカード登録を必要とするサービスの導入、およびオーナーへの新規 Secret 登録依頼。
- **許可**: 公開 OSS 向けに完全無料の GitHub Action / GitHub App、Secrets 不要のローカル LLM、リポジトリ内で完結するスクリプト。
- **許可**: 開発者個人のローカル環境で自分の負担で AI ツールを使うこと。禁止しているのは CI/CD への組み込みです。

判断に迷ったら PR を作らず Issue でオーナー (@genzouw) に相談してください。詳細は [`AGENTS.md`](https://github.com/genzouw/monopo/blob/main/AGENTS.md) を参照してください。

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
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。これらのワークフローを再開・移行・再導入してはいけません（撤去は別 PR で対応予定）。
- 最新のフロントエンド（React 19, Bun等）やAI CI/CDのトレンドを要約し、チームの継続的な学習を促進するための AI Weekly Tech Trend Analyzer (`.github/workflows/ai-tech-trend-analyzer.yml`) プロトタイプを導入しています。**GitHub Models (o3-mini) の廃止に伴い、スケジュール実行（cron）は現在停止中でしたが、gpt-4o-mini への移行が完了しました。再開する場合は設定を確認してください。** 手動実行（`workflow_dispatch`）のみ可能です。
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。これらのワークフローを再開・移行・再導入してはいけません（撤去は別 PR で対応予定）。

- 最新のAIエージェント（GitHub Copilot Agent, GPT-5.5, Claude 3.7, DeepSeek-R1 連携等）を利用する際は、生成されたコードのセキュリティリスク（機密情報の出力やインジェクション脆弱性）をローカルで必ず検証し、自動レビューツールとの多層的なチェックを行ってください。

- 新たなAIツールやサービスを導入する際は、公開リポジトリにおいて無料で利用可能であることを前提としてください。また、それらを設定するための手動の事前作業（Secretsへのトークン追加など）は必ずプルリクエストの説明に記載してください。
- 開発進捗の要約や課題分析には、GitHub Models (gpt-4o-mini) と Tavily Search API を連携した自動プロジェクトマネジメントツール (`.github/workflows/ai-weekly-summary.yml`) を用意しています。利用にあたっては、リポジトリの Secrets に `GH_MODELS_TOKEN` と `TAVILY_API_KEY` の事前登録が必須です。**GitHub Models (o3-mini) の廃止によりスケジュール実行（cron）は現在停止中でしたが、gpt-4o-mini への移行により再開の準備が整いました。**
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。これらのワークフローを再開・移行・再導入してはいけません（撤去は別 PR で対応予定）。

- `CLAUDE.md` は Claude Code 向けの設定ファイルとして自動生成されます。
