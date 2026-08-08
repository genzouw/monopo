### 💡 概要

- `ai-issue-plan.yml` に Tavily Search API を連携し、Issueの内容に加えて最新の開発ベストプラクティスを検索してプロンプトのコンテキストに追加するように修正しました。
- `ai-prompt-evaluator.yml` に `GH_MODELS_TOKEN` の環境変数を注入し、Promptfooが GitHub Models を利用できるように設定を追加しました。
- `prompts/promptfooconfig.yaml` および `prompts/sample-prompt.json` の初期設定ファイルを追加し、GitHub Models へのAPIキー連携を構成しました。
- `docs/security/ai-ci-tools.md` に、Tavily API キーおよび GH_MODELS_TOKEN などの手動設定手順に関するドキュメントを追加・更新しました。

### 🎯 目的

- AIを活用した開発自動化パイプラインのプロトタイピングおよび最適化を目的とし、無料のOSSやGitHub公式の環境で利用できる形に構成を改善するため。
- Issueから実装計画を生成する際、最新トレンド（RAG）を反映させることでAIの回答精度を高めるため。
- プロンプトの評価ワークフロー（Promptfoo）において、有料のAPIに依存せずGitHub Modelsを利用可能にするため。

### 📝 事前作業（手動セットアップ手順）

このPRをマージする前に、必ずリポジトリ管理者が以下の GitHub Secrets の設定を行ってください。

- `GH_MODELS_TOKEN`: GitHub Models へのアクセス用トークン (Settings > Secrets and variables > Actions に登録)
- `TAVILY_API_KEY`: Tavily Search API へのアクセス用キー (Settings > Secrets and variables > Actions に登録)
