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

フロントエンドの変更に対して、WCAG 準拠やUI/UXの観点でAIが自動レビューを行う `.github/workflows/ai-a11y-reviewer.yml` を追加しました。
無料の GitHub Models (o3-mini) と Tavily Search API を利用して最新のトレンドで評価します。

1. **GitHub Secretsの設定 (必須)**
   - このワークフローを動作させるには、リポジトリ管理者権限を持つユーザーが GitHub のリポジトリの `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー

## 新規: AI Weekly Project Summary の設定

週次のプロジェクト活動（コミット・PR）のサマリーと、最新のAI/CI-CDトレンド分析を自動生成し、Issueとして起票する `.github/workflows/ai-weekly-summary.yml` を追加しました。

1. **GitHub Secretsの設定 (必須・リポジトリ管理者権限が必要)**
   - このワークフローを動作させるには、リポジトリ管理者権限を持つユーザーが GitHub のリポジトリの `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー

## 新規: AI Architecture Reviewer の設定

Pull Request における変更に対して、リポジトリ全体を考慮したアーキテクチャ（設計やスケーラビリティ等）の観点で自動レビューを行う `.github/workflows/ai-architecture-reviewer.yml` を追加しました。

1. **GitHub Secretsの設定 (必須)**
   - このワークフローを動作させるには、リポジトリ管理者権限を持つユーザーが GitHub のリポジトリの `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー

## 新規: AI Test Automation の設定

Pull Request におけるソースコード変更に対して、最新のPlaywrightやJestのベストプラクティスに基づいたテストコードを自動提案する `.github/workflows/ai-test-automation.yml` を追加しました。

1. **GitHub Secretsの設定 (必須)**
   - このワークフローを動作させるには、リポジトリ管理者権限を持つユーザーが GitHub のリポジトリの `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー

## 更新: AI Issue Auto-Fixer の設定

Issueの内容をもとに自動でコードを修正する `.github/workflows/ai-issue-autofix.yml` において、Tavily Search APIの統合を行いました。これにより、より高度なRAG (Retrieval-Augmented Generation) で最新の開発情報を取得できるようになりました。また、推論の精度向上のため、GitHub Models の o3-mini に対して高精度パラメータを設定しています。

1. **GitHub Secretsの設定 (必須)**
   - 既存の `GH_MODELS_TOKEN` に加え、`TAVILY_API_KEY` の設定が必要です。
   - `Settings > Secrets and variables > Actions` で設定されているか確認してください。

## 更新: AI Tech News Digest の設定

週次のAI・自動化トレンドダイジェストを生成する `.github/workflows/ai-tech-news-digest.yml` において、Tavily Search API の `topic: 'news'` と `days: 7` パラメータを追加し、より最新の技術ニュースに特化して情報を取得できるように最適化しました。

1. **GitHub Secretsの設定 (必須)**
   - 本設定には**リポジトリ管理者権限**が必要です。
   - `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models APIにアクセスするためのトークン。
     - `TAVILY_API_KEY`: Tavily Search APIを利用するためのAPIキー。
