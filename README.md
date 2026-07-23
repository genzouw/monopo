# monopo (モノポ)

React + TypeScript + Vite で構築された Web ベースのボードゲームアプリケーション「monopo（モノポ）」です。

## 特徴 (Features)

- ブラウザ上で遊べる本格的なボードゲーム体験
- 複数人でのローカルプレイに対応
- ゲームの状態の自動保存と再開機能
- React + Vite による高速な動作と快適な開発体験
- セキュリティ・健全性の自動スキャン: CI/CD にて `osv-scanner` および `ossf/scorecard-action` を利用して依存関係とリポジトリ設定の脆弱性を継続的にスキャンしています

## 技術スタック (Tech Stack)

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Styling:** CSS Modules
- **State Management:** React `useReducer`
- **Testing:** Vitest, Testing Library
- **Package Manager:** bun

## 動作要件 (Requirements)

- **Node.js**: v22 (LTS) 以上を推奨
- **パッケージマネージャー**: bun v1.2 以上 (`npm` / `yarn` / `pnpm` の使用は避けてください)
- **セキュリティスキャン**: `bun audit` は現在 `bun.lock` テキスト形式に十分対応していないため、CVE スキャンは Dependabot に委ねています

## セットアップ (Setup Instructions)

リポジトリをクローンし、依存関係をインストールして開発サーバーを起動する手順は以下の通りです。

```bash
# リポジトリのクローン
git clone <repository-url>
cd <repository-name>

# 依存関係のインストール (必ず bun を使用してください)
bun install

# 開発サーバーの起動
bun run dev
```

ブラウザで `http://localhost:5173` にアクセスしてゲームをプレイできます。

## コマンド一覧 (Available Commands)

- `bun run dev`: 開発サーバーを起動します
- `bun run build`: プロダクション用にビルドします
- `bun run preview`: ビルドされたプロダクション環境をローカルでプレビューします
- `bun run test`: Vitest を使用してテストを実行します
- `bun run test:coverage`: テストのカバレッジを計測します
- `bun run lint`: ESLint を使用してコードの静的解析を行います
- `bun run format`: Prettier を使用してコードのフォーマットを行います
- `bun run typecheck`: TypeScript の型チェックを実行します
- `bun run sync:ai-guidelines`: AI コーディングアシスタント向け設定ファイル（`.cursorrules` / `.github/copilot-instructions.md` など）を `docs/ai-guidelines.md` から再生成します
- `bun run sync:ai-guidelines:check`: 上記の同期状態を検証します（CI で利用、差分があれば非 0 終了）

## AI コーディングアシスタント設定 (AI Coding Assistant Configuration)

本プロジェクトでは Cursor / GitHub Copilot 等の AI コーディングアシスタント向け設定ファイルが複数存在しますが、内容は `docs/ai-guidelines.md` をマスタとして自動生成されています。

ガイドラインを更新する際は次の手順に従ってください:

1. `docs/ai-guidelines.md` を編集
2. `bun run sync:ai-guidelines` を実行して各設定ファイルを再生成
3. 生成された差分も含めてコミット

新しい AI ツールへ対応する場合は `scripts/sync-ai-guidelines.ts` の `TARGETS` 配列にエントリを追加してください。

## 貢献について (Contributing)

コントリビューションは大歓迎です！
プロジェクトの環境構築方法、テストの実行、コーディング規約、プルリクエストの作成方法については [CONTRIBUTING.md](./CONTRIBUTING.md) をご確認ください。

**注意:** 商標上の理由により、プロジェクト全体（UIテキスト、ドキュメント、ファイル名など）で必ず「monopo（モノポ）」という名称を使用してください。

## セキュリティ報告窓口 (Security Reporting)

脆弱性を発見された場合は、公開 Issue / PR ではなく **非公開** にてご報告をお願いいたします。詳細は [SECURITY.md](./SECURITY.md) をご確認ください。
また、リポジトリ管理者に対して、GitHub ネイティブの **Secret Scanning** と **Push Protection** をリポジトリ設定から有効化することを強く推奨します。これにより、ローカルのチェックをすり抜けたシークレットも push 時にサーバー側でブロックされます。

## ライセンス (License)

このプロジェクトは [MIT License](./LICENSE.md) のもとで公開されています。
