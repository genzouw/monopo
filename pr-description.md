## 概要

### 💡 What

AIによる自動化とレビュー機能をより強化しつつ、無料かつ公開リポジトリで安全に動作する形に最適化するために、GitHub ActionsのワークフローとAI関連の設定を見直しました。
特にレガシーで不要になった `ai-open-code-review.yml` を削除し、最新の Ollama モデル `qwen2.5-coder:0.5b` (コーディング特化) へのアップデートを行いました。また、週間トレンドの検索処理では、#607 で導入済みの無料枠 DuckDuckGo 検索（ddgs）が本PRのモデル変更後も引き続き機能し、完全な無料運用を維持できていることを確認しています。

### 🎯 Why

- リポジトリのガイドラインにおいて、無料かつ公開リポジトリ向けの機能のみをCIに組み込むことが求められているため。
- 従量課金のサーチAPI（Tavily等）に頼らず、無料・認証なしで使える `ddgs` (DuckDuckGo Search) を活用し、トレンド検索機能を安全に復旧・稼働させるため。
- 最新のAIコミュニティトレンド（2025年最新）に合わせ、Ollama で使用するローカルLLMをよりコーディング支援に適した `qwen2.5-coder` モデルにアップグレードするため。
- 不要になったサードパーティのアクション (`raye-deng/open-code-review`) を削除し、すでに設定済みの CodeRabbit や Local Ollama などのレビュー体制に一本化することで保守性と安全性を向上するため。

### 📸 Before/After

- `local-ai-pr-reviewer.yml` / `local-ai-weekly-trend.yml` で使用するモデルを汎用モデル `qwen2.5:0.5b` からプログラミング特化の `qwen2.5-coder:0.5b` に変更。
- 役割が重複・非推奨化されていた `ai-open-code-review.yml` を削除。
- `local-ai-weekly-trend.yml` にて、`ddgs` パッケージによる最新トレンド情報の無料・安全な自動取得処理を確認。

### ♿️ Accessibility

該当なし

## 関連 Issue / 設計ドキュメント

なし

## 動作確認

ローカル環境にてワークフローの構文チェックを行い、正常であることを確認しました。Pythonでの検索(ddgs)もテストスクリプトで正常に取得できることを確認済みです。

## セルフチェック

- [x] `bun run lint` がパスする
- [x] `bun run typecheck` がパスする
- [x] 破壊的変更がある場合、README または docs を更新した
- [x] DB マイグレーションがある場合、ロールバック手順を確認した
- [x] secret / 個人情報を含むコードや設定が含まれていない
- [x] GitHub リポジトリ設定で Secret Scanning と Push Protection が有効になっていることを確認した（設定は管理者のみ）

## AIツール・CI/CD連携に関する手動セットアップ（必要な場合のみ）

特に追加のシークレット登録などの手動作業はありません。CodeRabbit 等は既存の設定で引き続き動作します。Weekly Trendの検索（DuckDuckGo）にもAPIキーは不要です。

## コスト方針のセルフチェック (公開 OSS)

- [x] LLM プロバイダや従量課金 API のキー (`GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `TAVILY_API_KEY` 等) を GitHub Secrets へ追加していない
- [x] 追加した SaaS / GitHub App / Action は公開 OSS リポジトリで完全無料であり、その根拠 URL を本文に記載した（外部サービスを追加していない場合はチェック可）
- [x] リポジトリオーナーへ新規 Secret の登録を依頼していない
- [x] `AGENTS.md` のポリシーに違反していないことを確認した
