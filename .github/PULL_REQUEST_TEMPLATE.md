<!--
  PR の説明テンプレート。
  該当しないセクションは削除して構いません。
-->

## 概要

<!-- このPRが何を解決するか / 何を追加するかを1〜3行で。 -->

### 💡 What

<!-- 追加・修正した内容 -->

### 🎯 Why

<!-- なぜこの変更が必要か -->

### 📸 Before/After

<!-- UI変更がある場合はスクリーンショットを貼付してください。 -->

### ♿ Accessibility

<!-- アクセシビリティへの配慮事項（例: aria-labelの追加など） -->

## 関連 Issue / 設計ドキュメント

<!-- 例: Closes #123, Refs docs/superpowers/specs/xxx.md -->

## 動作確認

<!-- ローカル / ステージングでどう確認したか、または確認方法。スクショ・ログがあれば貼る。 -->

- [ ] ローカルで動作確認した
- [ ] テストを追加・更新した（または不要な理由を記載）

## セルフチェック

- [ ] `bun run lint` がパスする
- [ ] `bun run typecheck` がパスする
- [ ] 破壊的変更がある場合、README または docs を更新した
- [ ] DB マイグレーションがある場合、ロールバック手順を確認した
- [ ] secret / 個人情報を含むコードや設定が含まれていない

## デプロイ時の注意

<!-- 環境変数追加 / インフラ変更 / 手動オペレーションが必要なら明記。なければ「なし」。 -->

なし

## AIツール・CI/CD連携に関する手動セットアップ（必要な場合のみ）

<!--
新しく追加した AI ツールや CI/CD サービスに手動のセットアップ（API キーや GitHub Secrets の登録など）が必要な場合、マージする前に以下に記載してください。
例:
- [ ] CodeRabbit GitHub App のインストール
- [ ] Sweep AI GitHub App のインストール
- [ ] Qodo Merge GitHub App のインストール
- [ ] GitHub Models アクセスのための `GH_MODELS_TOKEN` の Secret 登録
- [ ] Tavily API アクセスのための `TAVILY_API_KEY` の Secret 登録
-->
- [ ] Codeball GitHub App のインストール (https://github.com/apps/codeball)
