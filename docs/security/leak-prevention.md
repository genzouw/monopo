# 情報漏洩防止ガイドライン (Leak Prevention)

本リポジトリでは、ソースコードや設定ファイルに認証情報（API キー、パスワード、トークン、秘密鍵など）や個人情報が意図せずコミットされ、公開リポジトリを通じて漏洩することを防ぐため、以下の多層的な防御策を導入しています。

## 1. コミット前検知（ローカル防御）

開発者が自身のローカル環境で誤って秘密情報をコミットするのを防ぎます。

- **`gitleaks` フック**: コミット時に `.husky/pre-commit` フックを通してローカルで `gitleaks` が実行され、秘密情報を検知した場合はコミットをブロックします。
  - **⚠️ 注意**: `gitleaks` が未インストールの場合、コミットは自動的にブロックされます。意図せぬ秘密情報の混入を防ぐため、gitleaks のインストールが**必須**となっています。
  - **必須**: 開発環境には [gitleaks](https://github.com/gitleaks/gitleaks) をインストールしてください。（例: `brew install gitleaks` または GitHub のリリースページからダウンロード）
- **`.gitignore` と `.gitattributes` による除外・保護**:
  - `.env`, `.env.*` (ただし `.env.example` は除く)
  - `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`, `*credentials*.json`, `*secret*.json`, `*.npmrc`, `.netrc`, DBファイル(`*.sqlite` 等) 等
  - AI エージェントの作業跡（`.cursor/`, `.claude/`, `.aider*`, `.cline/` 等）はローカル環境特有の秘密情報が含まれるリスクがあるため除外しています。
  - **さらに、`.gitattributes` により、これらの秘密情報ファイルが誤って `git add` された場合でも、diff の中身がレビュー画面・ログ・PR 上で表示されない（`-diff` によりバイナリ扱いとなり `Binary files differ` 表示）よう、またリポジトリのアーカイブに含まれないよう（`export-ignore`）設定し、二重に保護しています。**
- **`pre-commit` framework**: `.pre-commit-config.yaml` による標準的なフック（秘密鍵の検知、YAML構文チェックなど）を利用してコミット前の安全性をさらに高めています。
  - **`detect-secrets`**: `pre-commit` のフックとして `Yelp/detect-secrets` を導入し、ベースライン（`.secrets.baseline`）に基づくシークレットのハードコード検知を追加しています。誤検知が発生した場合は、ローカル環境に `detect-secrets` をインストール（例: `pip install detect-secrets`）し、`detect-secrets audit .secrets.baseline` を実行してベースラインを更新してください。

## 2. CI 検知（リポジトリ防御）

ローカル環境の防御をすり抜けた場合でも、GitHub へプッシュされた時点で自動スキャンが実行されます。

- **Gitleaks ワークフロー (`.github/workflows/gitleaks.yml`)**:
  - 全ての PR と `main` ブランチへのプッシュ時に、対象となるソースコードをスキャンし、シークレットの漏洩があれば CI がエラー（赤検知）となります。正規表現とエントロピーによるパターンベースの検知を行います。
  - **カスタムルールの適用**: リポジトリ直下の `.gitleaks.toml` を使用し、デフォルトの Gitleaks ルールに加えて、個別の汎用ルール（例: メールアドレス等の個人情報 [PII] のハードコード、クラウド識別子 [AWS Account ID / GCP Project ID]、内部IPアドレス）も追加で検知するように強化されています。
- **TruffleHog ワークフロー (`.github/workflows/trufflehog.yml`)**:
  - `gitleaks` を補完する形で、実際に外部プロバイダ API に対して有効性を検証できたシークレット（有効性検証済み）のみを検知します（`--only-verified`）。誤検知を減らしつつ、漏洩したキーが現在も利用可能かどうかの重大なリスクを即座にブロックします。
- **Trivy ワークフロー (`.github/workflows/trivy.yml`)**:
  - パッケージの脆弱性や IaC の設定ミスに加え、シークレットのスキャン (`secret` スキャナ) も実施し、多角的に検知します。
- **CodeQL ワークフロー (`.github/workflows/codeql.yml`)**:
  - `security-extended` および `security-and-quality` クエリを使用して、データフロー解析によるシークレットのハードコード検知や品質チェックなど、高度な静的解析を行います。
- **権限 (Permissions) の最小化**:
  - CI の各ワークフロー (`.github/workflows/*.yml`) では `permissions` が明示されており、GitHub Actions が必要以上にリポジトリを書き換える権限を持たないように設計されています。

## 3. 定期監査（継続的棚卸し）

過去の履歴を含めて、見逃しがないかを継続的に監視します。

- **週次スケジュールスキャン**:
  - `gitleaks.yml`、`trufflehog.yml`、および `trivy.yml` には定期実行トリガー（毎週月曜日）が設定されており、Gitコミット履歴全体のスキャンおよび最新の脆弱性情報の取得を自動で行います。TruffleHog は定期監査においても有効なシークレットを継続的に監視します。
- **サプライチェーン・セキュリティ監視 (SBOM生成)**:
  - `sbom.yml` には定期実行トリガー（毎週月曜日）が設定されており、リポジトリ全体のソフトウェア部品表 (SBOM) を自動生成し、GitHub Dependency Graph にアップロードします。これにより、依存関係に起因する脆弱性やサプライチェーンリスクの可視化と管理を行います。

## 開発者の皆様へお願い

- **推奨（リポジトリ管理者向け）**: リポジトリ設定 (Settings > Code security and analysis) から、GitHub ネイティブの **Secret Scanning** と **Push Protection** を有効化することを強く推奨します。これにより、プッシュ時の検知がさらに強化されます（※この設定はリポジトリ管理者のみが変更できます）。
- 本番のシークレットや接続情報（DB、SaaS）を直接コードにハードコードせず、必ず環境変数を使用してください。
- PR 作成時など、誤って秘密情報を含めてしまったことに気づいた場合は、速やかに管理者に連絡し、必要に応じて該当シークレットの無効化（ローテーション）を行ってください。

### GitHub Actions の権限 (Permissions) の最小化

CI の各ワークフロー (`.github/workflows/*.yml`) では、予期せぬスクリプト実行や悪意ある Action からリポジトリを保護するため、**トップレベルでの `permissions` の明示を必須**としています。
未指定の場合、GitHub のデフォルト設定によっては過剰な権限（例: リポジトリの書き換え権限）が与えられる可能性があります。
CI の監査ワークフロー (`.github/workflows/permissions-audit.yml`) にて、全ワークフローファイルが `permissions:` を明示しているかを検査し、漏洩防止の基盤として「最小権限の原則 (Principle of Least Privilege)」を徹底しています。
