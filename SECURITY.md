# Security Policy

## Reporting a Vulnerability

このリポジトリで脆弱性を発見された場合は、**公開 Issue / PR / Discussion での報告は行わないでください**。

以下のいずれかの方法で **非公開** にてご連絡ください。

- **GitHub Security Advisories（推奨）**
  - <https://github.com/genzouw/monopo/security/advisories/new>
  - GitHub の "Private vulnerability reporting" 機能を使い、メンテナーと非公開でやり取りできます。
- **Email**
  - [genzouw@gmail.com](mailto:genzouw@gmail.com)

報告には可能な範囲で以下をお知らせください。

- 脆弱性の概要と想定される影響
- 再現手順 / PoC（あれば）
- 影響を受けるバージョン / コミット SHA
- 連絡先（クレジット表記の希望があればその旨）

## Response Expectations

本リポジトリは個人開発のため SLA は提示できませんが、以下を目安に対応します。

- 受領確認: 7 日以内
- 評価・初期回答: 14 日以内
- 修正リリース: 影響度に応じて随時

## Scope

このリポジトリのソースコード、ビルド成果物、`.github/workflows/` 配下の CI/CD 設定が対象です。
依存パッケージそのものの脆弱性は、原則として上流（各 OSS）にご報告ください。

## 漏洩防止の取り組み (Secret Leak Prevention)

本リポジトリでは、インフラ情報・認証情報・シークレットが意図せず公開リポジトリへコミット・push されることを防ぐため、以下の多層防御を実施しています。

- **ローカル検知**: `.husky/pre-commit` および `.husky/commit-msg` フックにより、`gitleaks` を用いたコミット前のソースコードやコミットメッセージ自体のシークレット混入検知を必須化しています。さらに、Node.js エコシステムに特化した `secretlint` を `lint-staged` に統合し、`.secretlintignore` で除外したロックファイル等を除くコミット対象のファイルに対する漏洩検知を二重化しています。
- **CI 検知**: GitHub Actions にて `gitleaks`、`trivy`、`trufflehog` を用い、PR差分およびリポジトリ全体の履歴・依存関係に含まれるシークレットを自動スキャンしています。また、`pre-commit` のフック（`detect-private-key` や `detect-secrets` 等）も CI 経由で実行し、ローカルのコミット前検知ルールをサーバー側でも一元的に適用しています。さらに、`actionlint` と `shellcheck` の連携や、`pyflakes`（静的解析ツール）の実行により、CI スクリプト経由のリスク（シェルインジェクションや Python スクリプトの不適切な記述等）を検知・抑止しています。ファイル名ベースの多層防御として、`.env` や各種キーファイル、AI エージェントの作業ディレクトリ（`.cursor/` 等）といった特定ファイルの混入を CI および `pre-commit` フックで明示的に検知・ブロックしています。 また、CI 上で実行される `secretlint` には `--format github` を指定し、PR の差分に対してインラインアノテーションを行うことで、開発者が漏洩箇所を GitHub UI 上で即座に特定・修正できるようにしています。
- **定期監査**: 週次ベースでリポジトリ全体のフルスキャンを自動実行し、設定ミスによる新たな漏洩リスクを継続的に監視しています。また、`osv-scanner` を用いた依存パッケージのOSS脆弱性走査や、`license-checker-rseidelsohn` を用いたライセンスコンプライアンスの定期走査も行い、サプライチェーン・コンプライアンスリスクの低減を図っています。さらに、`ossf/scorecard-action` を用いてリポジトリのセキュリティ設定・プラクティスの健全性を継続的に評価・スコアリングしています。

### GitHub Secret Scanning と Push Protection の推奨 (リポジトリ管理者向け)

リポジトリ管理者に対して、GitHub ネイティブの [Secret Scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning) および [Push Protection](https://docs.github.com/code-security/secret-scanning/protecting-pushes-with-secret-scanning) をリポジトリ設定画面から有効化することを強く推奨します。これにより、ローカルのチェックをすり抜けたシークレットも push 時にサーバー側でブロックされます。

### GitHub Actionsの安全な設定と `pull_request_target` の禁止

CI 経由でのトークンやシークレットの流出を防ぐため、以下のルールを適用しています。

- **`pull_request_target` の使用禁止**: フォーク元から悪意のあるコードがシークレット付きで実行されるリスクがあるため、`pull_request_target` トリガーの使用を禁止し、通常の `pull_request` に統一しています。どうしてもシークレットや高い権限が必要な場合は、GitHub Environments の承認機能（※設定にはリポジトリ管理者権限が必要です）を利用するなど、安全な代替策を検討してください。なお、このルールは CI（`.github/workflows/permissions-audit.yml`）によって明示的かつ自動的に検証されます。

### GitHub Actions の権限 (Permissions) の最小化

CI の各ワークフロー (`.github/workflows/*.yml`) では、予期せぬスクリプト実行や悪意ある Action からリポジトリを保護するため、**トップレベルでの `permissions` の明示を必須**としています。
未指定の場合、GitHub のデフォルト設定によっては過剰な権限（例: リポジトリの書き換え権限）が与えられる可能性があります。
CI の監査ワークフロー (`.github/workflows/permissions-audit.yml`) にて、全ワークフローファイルが `permissions:` を明示しているかを検査し、漏洩防止の基盤として「最小権限の原則 (Principle of Least Privilege)」を徹底しています。

### CI ワークフローの権限最小化 (Least Privilege in CI)

リポジトリに対する予期せぬ変更やインジェクション攻撃時の二次被害を防ぐため、`.github/workflows/` 配下の CI ワークフローでは**トップレベルの権限を読み取り専用 (`contents: read` など最小限) に制限**しています。書き込み権限（例: `pull-requests: write`, `security-events: write`）が必要な場合は、トップレベルではなく、その権限を実際に必要とする**ジョブ単位 (`jobs.<job_name>.permissions`) に絞って付与**することを徹底しています。

### 追加の漏洩防止対策 (Pre-commit 強化)

- pre-commit-hooks (check-symlinks, destroyed-symlinks) を導入しています。`check-symlinks` はリンク先が存在しない壊れたシンボリックリンクを、`destroyed-symlinks` はシンボリックリンクがリンク先パスを内容とする通常ファイルへ置き換わった状態を検出します。ただし、リンク先が存在する**有効な**シンボリックリンク（例: `ln -s ~/.ssh/id_rsa key`）の混入は、いずれのフックも検知対象外です。

### 環境差の吸収 (改行コードの正規化)

- pre-commit-hooks の `mixed-line-ending` を `args: ['--fix=lf']` で導入し、改行コードを LF へ自動統一しています（検知して止めるのではなく、対象ファイルを書き換えたうえで非 0 終了する自動修正フックです）。これは漏洩防止ではなく、`.editorconfig` の `end_of_line = lf` や Prettier の既定 `endOfLine: "lf"` との整合を取り、環境依存の改行コード混在による意図しない差分・CI 失敗を防ぐことが目的です。

ファイル名・パスベースによる特定ファイル (環境変数ファイル、キーファイル、AI エージェント作業ディレクトリなど) のコミット防止ルールを、ローカルのシェルスクリプト依存から `.pre-commit-config.yaml` のカスタムフック (`forbid-sensitive-files`) へと移行・統合しました。
これにより、CI 上で稼働する `pre-commit` ワークフローとローカル環境での防止ルールが一元化され、防御の確実性が向上しています。

### PR スキャン対象ブランチの拡張について

TruffleHog および pre-commit（gitleaks/detect-secrets）による CI スキャンは、`main` ブランチだけでなく全てのフィーチャーブランチの PR に対しても実行されるよう設定されています。これにより、開発の初期段階からシークレットの流出やポリシー違反を未然に防ぎます。

### 接続文字列・バックエンドURLのハードコード禁止

データベース（PostgreSQL, MongoDB, MySQL）やキャッシュ（Redis）への完全な接続文字列（`postgres://...` や `redis://...` 等）のソースコードへのハードコードは、`.gitleaks.toml` のカスタムルール (`monopo-connection-string`) によって検知・ブロックされます。パスワードが含まれていない場合でも、環境によって接続先が変わるべき値であるため、必ず環境変数経由で設定してください。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化)

クラウドリソースの識別子（Azure Subscription ID など）や、最新の AI サービストークン（OpenAI Service Account Token など）がコードベースにハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールを拡張しました。
これにより、標準の Gitleaks ルールではカバーしきれない特定のクラウドプロバイダや AI ツールの識別子がローカルおよび CI の双方で早期に検知・ブロックされ、漏洩リスクをさらに低減しています。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化 - Modern PaaS/DBaaS対応)

Vite / React 系のモダンな技術スタックにおいて利用頻度が高い PaaS や DBaaS (Figma, Render, PlanetScale, Fly.io, Neon 等) の API トークンがコードベースにハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルール (`monopo-modern-paas-token`) を追加しました。検知対象は正規表現で定義された特定のプレフィックス・文字数の形式（`figd_` 43文字、`rnd_` 32文字以上、`pscale_tkn_` 43文字、`fm2_` 40文字以上、`neon_` 64文字）に限定されており、各サービスの API トークン全般を網羅するものではありません。これにより、上記フォーマットに一致するシークレットが、コミット前および CI にて検知・ブロックされます。

### CodeQL による GitHub Actions のコードスキャン

CI 検知・定期監査の強化として、`.github/workflows/codeql.yml` にて `actions` 言語をスキャン対象に追加しています。これにより、GitHub Actions ワークフロー内の潜在的なセキュリティリスク（式インジェクション、信頼できない入力の不適切な処理など）を、データフロー解析を用いて自動検出します。既存の `actionlint` や `zizmor` と組み合わせることで、CI スクリプト経由の漏洩・インジェクションに対する多層防御を実現しています。検知結果は GitHub の Security タブの Code scanning alerts に集約される形式であり、現時点では `main` ブランチの必須ステータスチェックには含まれていないため、マージをブロックするゲートではありません。
