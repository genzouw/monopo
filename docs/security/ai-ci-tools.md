# AIおよびCIツールの導入設定マニュアル

このドキュメントでは、本リポジトリに導入されたAI自動化ツールおよびCI/CDパイプラインの設定について記載します。

## CodeRabbitとサーチサービスの設定

`.coderabbit.yaml` にて、AIレビュー品質向上のためのWeb検索（サーチサービス連携）を有効化しました。

- 追加の手動のAPIキー設定等は不要です（CodeRabbit側でデフォルトで提供される機能を明示的にONにしています）。

## PR-Agentの設定（既存）

`.pr_agent.toml` での類似Issue/PR検索機能を利用するためには、以下の手動設定が必要です。

1. **GitHub Secretsの設定**
   - ベクターデータベース（Pinecone等）を利用する場合、GitHubのリポジトリの Settings > Secrets and variables > Actions にて、`PINECONE_API_KEY` をシークレットとして登録してください。
   - `OPENAI_KEY` 等の必要なLLMのAPIキーも同様に登録されていることを確認してください。

## RepomixによるAI向けコンテキストパックの設定

`repomix.config.json` にて、コードベース全体をAI（LLM等）が読み込みやすい単一ファイルにパックするための設定を行いました。
また、`.github/workflows/ai-repomix.yml` を追加し、リポジトリへのPush時に自動的にコンテキストファイル (`codebase.xml`) が生成され、GitHub Actionsのアーティファクトとしてアップロードされるようにしました。追加の手動のAPIキー設定等は不要です。

## Lighthouse CIの設定

フロントエンドの品質向上ツールとして Lighthouse CI (`treosh/lighthouse-ci-action`) を導入しました。

1. **動作の確認**
   - `.lighthouserc.json` の `upload.target: "temporary-public-storage"` により、レポートは一時的な公開ストレージ（7日間で削除）にアップロードされます。
     - 参考: `treosh/lighthouse-ci-action` の入力引数では同等の指定が `temporaryPublicStorage: true` という名称になりますが、本リポジトリでは設定を `.lighthouserc.json` 側に集約しているため、ワークフロー側ではこの入力引数を使用していません。
   - よりセキュアな運用が必要な場合は、プライベートなLHCIサーバーを構築し、シークレット（`LHCI_SERVER_URL`, `LHCI_SERVER_TOKEN`）を登録した上で `.lighthouserc.json` の `upload.target` を `lhci` に変更する運用を検討してください。

## 新規: AI Accessibility Reviewer の設定

フロントエンドの変更に対して、WCAG 準拠やUI/UXの観点でAIが自動レビューを行う .github/workflows/ai-a11y-reviewer.yml を追加しました。
無料の GitHub Models (o3-mini) と Tavily Search API を利用して最新のトレンドで評価します。
1. **GitHub Secretsの設定 (必須)**
   - このワークフローを動作させるには、GitHub のリポジトリの Settings > Secrets and variables > Actions にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー
