<!--
  ⚠️ このファイルは自動生成されています。直接編集しないでください。
  対象ツール: GitHub Copilot
  マスタ: docs/ai-guidelines.md
  同期: bun run sync:ai-guidelines
-->

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
- 本リポジトリには過去に GitHub Models (gpt-4o-mini) を利用した自作の AI PR Reviewer を試験導入していましたが、**現在は稼働していません。**
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。**このワークフローは実行禁止・廃止済みであり、再開・移行・再導入してはいけません**（撤去は別 PR で対応予定）。
- 最新のフロントエンド（React 19, Bun等）やAI CI/CDのトレンドを要約する AI Weekly Tech Trend Analyzer (`.github/workflows/ai-tech-trend-analyzer.yml`) のプロトタイプが存在しますが、GitHub Models に依存しているため **現在は実行禁止・廃止済みです。** スケジュール実行（cron）は停止済みで、`workflow_dispatch` による手動実行も行わないでください。
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。**このワークフローは実行禁止・廃止済みであり、再開・移行・再導入してはいけません**（撤去は別 PR で対応予定）。

- 最新のAIエージェント（GitHub Copilot Agent, GPT-5.5, Claude 3.7, DeepSeek-R1 連携等）を利用する際は、生成されたコードのセキュリティリスク（機密情報の出力やインジェクション脆弱性）をローカルで必ず検証し、自動レビューツールとの多層的なチェックを行ってください。

- Qodo Merge (PR-Agent) の高度な自動化設定として、`.pr_agent.toml`（Qodo公式の設定ファイル名。ハイフン区切りの `.pr-agent.toml` は認識されないため使用しないでください）に カスタムレビュープロンプト（`pr_custom_prompt`）を定義しています。アーキテクチャとセキュリティの観点は `[pr_reviewer]` の `extra_instructions` に集約しています（`/analyze` は差分から変更コンポーネントを機械的に列挙するツールで `extra_instructions` を受け取る口がないため、`[pr_analyze]` セクションは設けません）。出力言語は `[config] response_language` で一元管理しており、「日本語で記述してください」だけの `extra_instructions` は各セクションに置かないでください（設定の二重化で実挙動と食い違う原因になります）。**Qodo Merge のサブスクリプションが失効しているため、これらの設定は現時点でどのPRでも評価されません（`qodo-code-review` Bot が `Qodo reviews are paused because the subscription is no longer active` とコメントする状態）。** Qodo に一般向けの恒久無料ティアはなく、無料で使えるのは Qodo for Open Source プログラム（公開・継続保守中で、対象組織に GitHub Stars 200 以上があるなど）の適格なリポジトリに限られます。**サブスクリプションの再有効化、および `/review` や `/custom_prompt` の実行案内は、(1) 本リポジトリが同プログラムの適格性を満たすこと、(2) Qodo側の承認が下りていること、(3) 支払い方法の登録・従量課金・超過課金が一切発生しないことの3点を確認できた場合に限定してください。** これら3点を確認できない場合は再有効化を案内せず、Refs #587 でオーナー (@genzouw) に確認してください。3点を確認できた場合は、その事実（monopoとしての承認状況・課金プラン・カード登録要否・超過課金の有無）を Refs #587 に記録したうえで、実際に `/review` や `/custom_prompt` を実行して日本語出力になることを確認してください（検証項目は Refs #587 に集約しています）。なお `pr_custom_prompt` はPR作成時に自動実行されるものではなく、PRコメントで `/custom_prompt` と手動投稿した場合にのみ発火する設定です。

- 新たなAIツールやサービスを導入する際は、公開リポジトリにおいて無料で利用可能であることを前提としてください。また、それらを設定するための手動の事前作業（Secretsへのトークン追加など）は必ずプルリクエストの説明に記載してください。
- 開発進捗の要約や課題分析を目的とした GitHub Models (gpt-4o-mini) と Tavily Search API 連携の自動プロジェクトマネジメントツール (`.github/workflows/ai-weekly-summary.yml`) のプロトタイプが存在しますが、GitHub Models および従量課金の Tavily Search API に依存しているため **現在は実行禁止・廃止済みです。** スケジュール実行（cron）は停止済みで、`GH_MODELS_TOKEN` / `TAVILY_API_KEY` の Secrets 登録も行わないでください。
  - ⚠️ **本節の GitHub Models 依存ワークフローは上記「最重要原則」に適合していません。** GitHub Models は 2026-07-30 に[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しており推論 API 自体が存在しません。また `TAVILY_API_KEY` は従量課金の検索 API キーであり CI 組み込みは禁止です。**このワークフローは実行禁止・廃止済みであり、再開・移行・再導入してはいけません**（撤去は別 PR で対応予定）。

- `CLAUDE.md` は Claude Code 向けの設定ファイルとして自動生成されます。
