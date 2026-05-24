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

## Lighthouse CIの設定

フロントエンドの品質向上ツールとして Lighthouse CI (`treosh/lighthouse-ci-action`) を導入しました。

1. **動作の確認**
   - デフォルトでは `temporaryPublicStorage: true` となっており、レポートは一時的な公開ストレージ（7日間で削除）にアップロードされます。
   - よりセキュアな運用が必要な場合は、プライベートなLHCIサーバーを構築し、シークレット（`LHCI_SERVER_URL`, `LHCI_SERVER_TOKEN`）を登録した上で `temporaryPublicStorage` をオフにする運用を検討してください。
