# AIおよびCIツールの導入設定マニュアル

このドキュメントでは、本リポジトリに導入されたAI自動化ツールおよびCI/CDパイプラインの設定について記載します。

## CodeRabbitとサーチサービスの設定

`.coderabbit.yaml` にて、AIレビュー品質向上のためのWeb検索（サーチサービス連携）を有効化しました。

- 追加の手動のAPIキー設定等は不要です（CodeRabbit側でデフォルトで提供される機能を明示的にONにしています）。

## 新規: CodeAnt AI CI Scan の設定

SAST/SCA/Secretsスキャンを自動実行する `.github/workflows/codeant-ci-scan.yml`（`CodeAnt-AI/codeant-ci-scan-action`）を追加しました。

1. **GitHub Secretsの設定 (必須)**
   - リポジトリ管理者権限を持つユーザーが `Settings > Secrets and variables > Actions` にて `ACCESS_TOKEN_GITHUB` を登録してください。
   - このトークンはCodeAnt AI側の認証に使用されるため、**本リポジトリ専用に発行した最小権限（Fine-grained PAT等）のトークン**を使用し、組織全体・複数リポジトリにまたがる広いスコープのトークンを使い回さないでください。
2. **未設定時の挙動**
   - `ACCESS_TOKEN_GITHUB` が未登録の場合、ワークフローは `::warning::` ログを出力したうえでスキャン実行ステップをスキップします（CI自体は失敗しません）。

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

## 更新: AI Issue Plan の設定

Issueの内容をもとに実装に必要なファイルのリストと大まかなタスクリストを生成する `.github/workflows/ai-issue-plan.yml` において、Tavily Search APIの統合を行いました。

1. **GitHub Secretsの設定 (必須)**
   - 既存の `GH_MODELS_TOKEN` に加え、`TAVILY_API_KEY` の設定が必要です。
   - `Settings > Secrets and variables > Actions` で設定されているか確認してください。

2. **Issueタイトル・本文の外部送信に関する判断基準**
   - `issues.opened` はリポジトリの可視性に関わらず発火するため、Issue タイトル・本文に機密情報が含まれる可能性がある**非公開リポジトリでは Tavily Search API への送信自体をスキップ**します（`context.payload.repository.private` を判定）。
   - 公開リポジトリでは、Issue タイトル・本文はもとより公開情報のため送信対象としますが、Tavily は取得したクエリ内容を第三者の検索インデックスプロバイダと共有する場合がある点に留意してください（[Tavily Privacy Policy](https://tavily.com/privacy)）。
   - オプトアウトしたい場合は、当該ワークフローの `isPrivateRepo` 判定を `true` 固定に変更するか、ワークフロー自体を無効化してください。

3. **コスト制御**
   - 公開リポジトリでは誰でも Issue を作成でき、Issue作成のたびに Tavily API 呼び出しが発生するため、`search_depth` は高コスト（2クレジット/回）な `advanced` ではなく低コスト（1クレジット/回）な `basic` を使用しています。

## 新規: Promptfoo (AI Prompt Evaluator) の設定

PR作成時にプロンプトへの変更（`prompts/**`）が含まれている場合、変更前と変更後のプロンプトを自動的に評価・比較し、PRにコメントとしてレポートを通知する `.github/workflows/ai-prompt-evaluator.yml` を追加しました。
最新のLLMセキュリティテスト、およびプロンプトの回帰テストを目的としています。

1. **GitHub Secretsの設定 (必須)**
   - 無料で利用可能な GitHub Models を評価モデルとして使用しますが、Actionの環境変数に `GH_MODELS_TOKEN` の注入が必要です。
   - `Settings > Secrets and variables > Actions` にて、`GH_MODELS_TOKEN` をシークレットとして登録してください。
   - `GH_MODELS_TOKEN` に fine-grained PAT（Personal Access Token）を使用する場合は、`models: read` 権限を明示的に付与する必要があります。リポジトリの Workflow 権限（`permissions:`）だけでは GitHub Models へのアクセス権は付与されません。
   - GitHub Models には無料枠（レート制限あり）と有料枠があります。呼び出し頻度が増えて無料枠のレート制限に達する場合は、有料枠への切り替えおよび予算管理を検討してください。

2. **Secrets の信頼範囲について**
   - 本ワークフローは `pull_request`（`pull_request_target` ではない）トリガーで、変更後の `prompts/promptfooconfig.yaml` を用いて評価を実行します。
   - GitHub Actions の仕様上、フォーク由来のPRには `GH_MODELS_TOKEN` 等のSecretsは渡されないため、フォークPRによる秘密情報の持ち出しはできません。
   - 一方、同一リポジトリのブランチから作成されたPR（書き込み権限を持つ協力者のみ作成可能）ではSecretsが利用されるため、`prompts/**` の変更を含むPRは他の変更と同様にレビューを行ってください。

## 更新: AI Tech News Digest の設定

週次のAI・自動化トレンドダイジェストを生成する `.github/workflows/ai-tech-news-digest.yml` において、Tavily Search API の `topic: 'news'` と `days: 7` パラメータを追加し、より最新の技術ニュースに特化して情報を取得できるように最適化しました。

1. **GitHub Secretsの設定 (必須)**
   - 本設定には**リポジトリ管理者権限**が必要です。
   - `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models APIにアクセスするためのトークン。
     - `TAVILY_API_KEY`: Tavily Search APIを利用するためのAPIキー。

## 新規: Open Code Review の設定

PR作成時にAI生成コードのハルシネーションや非推奨API、ロジックのギャップを検出するローカルLLMベースの品質ゲートとして `raye-deng/open-code-review@v2.1.5` を導入しました。

1. **GitHub Secretsの設定**
   - 追加のAPIキー設定は不要です。デフォルトの `GITHUB_TOKEN` を使用して動作します。

## 新規: AI Documentation Sync Checker の設定

PR作成時にソースコードの変更が既存のドキュメント（README等）の更新を必要とするかどうかをAIが判定し、警告をコメントする `.github/workflows/ai-doc-sync-checker.yml` を追加しました。

1. **GitHub Secretsの設定 (必須)**
   - このワークフローを動作させるには、リポジトリ管理者権限を持つユーザーが GitHub のリポジトリの `Settings > Secrets and variables > Actions` にて、以下のシークレットを登録してください。
     - `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン
     - `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー

## 新規: AI PR Description Generator の設定

PR作成時にGitHub Models (o3-mini) を利用して、PRテンプレートに沿った概要（What, Why等）を自動生成し、コメントとして通知する `.github/workflows/ai-pr-description.yml` を追加しました。

1. **GitHub Secretsの設定 (必須)**
   - リポジトリ管理者が `Settings > Secrets and variables > Actions` にて `GH_MODELS_TOKEN` を登録している必要があります。

## 削除: AI Codeball PR Approver について

PRの自動承認を行う `.github/workflows/ai-codeball-approver.yml`（Codeball, `sturdy-dev/codeball-action`）を導入していましたが、本リポジトリのAction許可リスト（`genzouw` 所有 / GitHub作成 / Marketplace検証済み / 個別許可パターンのいずれかに限定）に `sturdy-dev/codeball-action` が含まれておらず、CIが恒常的に失敗する状態となっていたため削除しました。
再導入する場合は、リポジトリ管理者が `Settings > Actions > General > Allow select actions and reusable workflows` にて `sturdy-dev/codeball-action` を許可リストに追加した上で対応してください。
