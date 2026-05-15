# monopo (モノポ)

React + TypeScript + Vite で構築された Web ベースのボードゲームアプリケーション「monopo（モノポ）」です。

## 特徴 (Features)

- ブラウザ上で遊べる本格的なボードゲーム体験
- 複数人でのローカルプレイに対応
- ゲームの状態の自動保存と再開機能
- React + Vite による高速な動作と快適な開発体験

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

## 貢献について (Contributing)

コントリビューションは大歓迎です！
プロジェクトの環境構築方法、テストの実行、コーディング規約、プルリクエストの作成方法については [CONTRIBUTING.md](./CONTRIBUTING.md) をご確認ください。

**注意:** 商標上の理由により、プロジェクト全体（UIテキスト、ドキュメント、ファイル名など）で必ず「monopo（モノポ）」という名称を使用してください。

## ライセンス (License)

このプロジェクトは [MIT License](./LICENSE.md) のもとで公開されています。
