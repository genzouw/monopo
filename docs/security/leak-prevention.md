# 情報漏洩防止ガイドライン (Leak Prevention)

本リポジトリでは、ソースコードや設定ファイルに認証情報（API キー、パスワード、トークン、秘密鍵など）や個人情報が意図せずコミットされ、公開リポジトリを通じて漏洩することを防ぐため、以下の多層的な防御策を導入しています。

## 1. コミット前検知（ローカル防御）

開発者が自身のローカル環境で誤って秘密情報をコミットするのを防ぎます。

- **`gitleaks` フック**: コミット時に `.husky/pre-commit` および `.husky/commit-msg` フックを通してローカルで `gitleaks` が実行され、ソースコードやコミットメッセージ自体から秘密情報を検知した場合はコミットをブロックします。
  - **⚠️ 注意**: `gitleaks` が未インストールの場合、コミットは自動的にブロックされます。意図せぬ秘密情報の混入を防ぐため、gitleaks のインストールが**必須**となっています。
  - **自動セットアップ**: 本リポジトリでは `package.json` の `prepare` スクリプトにより、初回 `bun install` 時に自動で Husky と pre-commit フックがセットアップされます。
  - **必須**: 開発環境には [gitleaks](https://github.com/gitleaks/gitleaks) をインストールしてください。（例: `brew install gitleaks` または GitHub のリリースページからダウンロード）
- **`secretlint` 連携 (`lint-staged`)**:
  - Node.js エコシステムに特化した `secretlint` を `lint-staged` に統合し、`.secretlintignore` で除外したロックファイル等を除くコミット対象のファイルに対して高速なシークレットスキャンを実行します。`gitleaks` と二重化することで検知精度を向上させています。
- **`.gitignore` と `.gitattributes` による除外・保護**:
  - `.env`, `.env.*` (ただし `.env.example` は除く)
  - `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`, `*credentials*.json`, `*secret*.json`, `*.npmrc`, `.netrc`, DBファイル(`*.sqlite` 等) 等
  - クラウド・インフラ系ツールのローカル状態ディレクトリやファイル（`.vercel/`, `.netlify/`, `.wrangler/`, `.serverless/`, `.sst/`, `.envrc` 等）は、クラウド識別子やデプロイ用の一時トークンが含まれるリスクがあるため除外しています。
  - AI エージェントの作業跡（`.copilot/`, `.cursor/`, `.claude/`, `.aider*`, `.cline/`, `.windsurf/`, `.trae/`, `.roo/` 等）やエディタのローカル履歴（`.history/`）、デバッグ等で出力されるログファイル・レポートファイル（`*.log`, `*-report.md`）、ソースコードの差分ファイル（`*.patch`, `*.diff`）はローカル環境特有の秘密情報や未公開コードが含まれるリスクがあるため除外しています。
  - **さらに、`.gitattributes` により、これらの秘密情報ファイルが誤って `git add` された場合でも、diff の中身がレビュー画面・ログ・PR 上で表示されない（`-diff` によりバイナリ扱いとなり `Binary files differ` 表示）よう、またリポジトリのアーカイブに含まれないよう（`export-ignore`）設定し、二重に保護しています。**
- **VS Code / Cursor 用安全側プリセット (`.vscode/settings.json`)**: リポジトリに事前に設定されたプリセットにより、ローカルエディタのエクスプローラーや検索からシークレットファイル (`.env`, `*.pem`, `id_rsa`等) やAIエージェントの作業跡 (`.copilot/`, `.cursor/`, `.claude/` 等に加え `ai-report-*.md` などの一時ファイル)、エディタ履歴 (`.history/`)、ソースコードの差分ファイル（`*.patch`, `*.diff`）などを除外 (`files.exclude`, `search.exclude`) し、誤露出・誤操作のリスクを低減します。コミット防止は `.gitignore` および各種フック（`gitleaks`、`forbid-sensitive-files`）で担保します。
  - これは VS Code/Cursor のワークスペース設定を利用した補助的な防御であり、他のエディタや設定を無効化・上書きされた環境には適用されません。設定反映後はエディタを再起動し、`test.patch` 等が Explorer と検索結果から除外されること、GitHub の Push Protection が有効であることを確認してください。
- **`pre-commit` framework**: `.pre-commit-config.yaml` による標準的なフック（秘密鍵の検知、YAML構文チェックなど）を利用してコミット前の安全性をさらに高めています。
  - **`detect-secrets`**: `gitleaks` を補完し、エントロピーベースで未知の高乱数なシークレットや独自フォーマットのトークンを検知します。
    - **セットアップ**: `pre-commit install` 実行時に自動的にインストールされます。追加の手動インストールは不要です。
    - **ベースラインファイル (`.secrets.baseline`)**: リポジトリ直下に配置し、バージョン管理下に含めます。初回生成は `detect-secrets scan > .secrets.baseline`、更新は `detect-secrets scan --baseline .secrets.baseline` で行います。
    - **未検証検出 (`is_verified: false`) の扱い**: ベースラインへのコミット前に対象箇所を目視確認してください。誤検知（GitHub Actions secrets 参照など）の場合は該当行に `# pragma: allowlist secret` コメントを追加してから再スキャンし、エントリを削除します。実際のシークレットの場合は即座にローテーション（無効化・再発行）を行ってください。
    - **検出の限界**: 低エントロピーの短いパスワードや独自フォーマットの秘密情報は検知困難な場合があります。`gitleaks` との多層防御で補完しています。
    - **トラブルシューティング**: 誤検知が出た場合は `# pragma: allowlist secret` コメントをその行末に追加するか、`detect-secrets scan --baseline .secrets.baseline` でベースラインを更新して既知の誤検知として登録してください。また、ローカル環境に `detect-secrets` をインストール（例: `pip install detect-secrets`）後、`detect-secrets audit .secrets.baseline` を実行してインタラクティブに誤検知を確認・登録することもできます。
  - **自動依存解決**: `pre-commit` framework が実行する gitleaks フックには、システム依存の `gitleaks-system` ではなく、pre-commit が自動で依存関係を解決して実行する `gitleaks` を使用することで、CI 環境や新規開発者の環境での実行エラーを防ぎ、安定性を向上させています（なお、9〜12行目の `.husky/pre-commit` 経由の gitleaks 実行には、引き続きローカルへの gitleaks インストールが必要です）。
- **`actionlint` および `zizmor` フック (pre-commit)**: `.github/workflows/` 配下の YAML ファイルに対して、コミット前に `actionlint` と `zizmor` を実行します。
  - **`actionlint` の外部ツール連携**: `actionlint` 単体ではカバーしきれない `run:` ブロック内のシェルスクリプトや Python スクリプトのインジェクションリスク、構文エラーをローカルでより確実に検知するため、`actionlint-docker` フックを使用し、内部に同梱された `shellcheck` および `pyflakes` を連携させています。
    - **必須（Docker）**: `actionlint-docker` は Docker イメージとして実行されるため、`.github/workflows/` 配下のファイルをコミットする際は事前に Docker（Docker Desktop 等）を起動しておく必要があります。Docker が未起動の場合、コミット時にこのフックが失敗しブロックされます。`pre-commit run --all-files` を実行することで、コミット前にローカルで動作確認できます。
  - **`zizmor` の検査範囲**: `zizmor` はワークフローファイルに加えて `.github/dependabot.yml` および `action.yml` / `action.yaml`（コンポジットアクション）も検査対象に含みます。
  - **実行モードの固定**: `args: ['--no-progress', '--offline']` により**オフラインモードに固定**しています。`zizmor` は `GH_TOKEN` / `GITHUB_TOKEN` / `ZIZMOR_GITHUB_TOKEN` のいずれかが環境変数にあると自動でオンラインモードへ切り替わり、追加検知によってコミットがブロックされます。固定しない場合「トークンを export している開発者だけコミットできない」状態となり、その回避に使われる `git commit --no-verify` が gitleaks を含む**すべての**フックを無効化してしまうため、ローカルはオフラインに固定しています。オンライン検査は CI (`.github/workflows/zizmor.yml`) が担当します。
  - これにより、インジェクションリスクや不適切な権限指定といった CI 固有の脆弱性を**ローカルで早期に検知します**。ただし `git commit --no-verify` やフック未インストールの場合は素通りするため、これは「未然の防止」ではなく早期検知の層です。すり抜けた場合は CI の `zizmor.yml` で検知します。
  - **検知漏れの補完**: 動的に取得される外部スクリプトなど `actionlint` の対象外となるリスクは、`zizmor` および `permissions-audit.yml` の CI 検査で補完します。

## 2. CI 検知（リポジトリ防御）

ローカル環境の防御をすり抜けた場合でも、GitHub へプッシュされた時点で自動スキャンが実行されます。

- **Secretlint ワークフロー (`.github/workflows/secretlint.yml`)**:
  - 全てのブランチへの push および全ての PR、さらに週次のスケジュールで `secretlint` のジョブを実行し、Node.js エコシステムに特化したシークレット漏洩スキャンを行います。これにより、ローカルのフックをすり抜けた場合でも追加の検知層として機能します（ただし、未知のパターンや `.secretlintignore` で除外した対象までは検知できません）。
- **Gitleaks ワークフロー (`.github/workflows/gitleaks.yml`)**:
  - 全ての PR とすべてのブランチへのプッシュ時に、対象となるソースコードをスキャンし、シークレットの漏洩があれば CI がエラー（赤検知）となります。正規表現とエントロピーによるパターンベースの検知を行います。
  - **カスタムルールの適用**: リポジトリ直下の `.gitleaks.toml` を使用し、デフォルトの Gitleaks ルールに加えて、個別の汎用ルール（例: メールアドレスや国内電話番号・マイナンバー等の個人情報 [PII] のハードコード、クラウド識別子 [AWS Account ID / GCP Project ID / GCP サービスアカウント]、内部IPアドレス、各種 SaaS・AI トークン (Groq, OpenRouter, DeepSeek 含む)、Observability トークン (Sentry, Datadog)、Payment トークン (Stripe)）も追加で検知するように強化されています。
- **TruffleHog ワークフロー (`.github/workflows/trufflehog.yml`)**:
  - `gitleaks` を補完する形で、実際に外部プロバイダ API に対して有効性を検証できたシークレット（有効性検証済み）のみを検知します（`--only-verified`）。誤検知を減らしつつ、漏洩したキーが現在も利用可能かどうかの重大なリスクを即座にブロックします。
- **Trivy ワークフロー (`.github/workflows/trivy.yml`)**:
  - パッケージの脆弱性や IaC の設定ミスに加え、シークレットのスキャン (`secret` スキャナ) も実施し、多角的に検知します。設定ミスやシークレットが検知された場合は CI をブロック（`--exit-code 1`）しますが、パッケージの脆弱性検知時は開発の利便性を考慮しブロックしません（`--exit-code 0`）。
  - **対象範囲の拡張**: すべての重要度（`UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL`）のシークレットおよび設定ミスをスキャン対象とし、軽微な情報漏洩リスクも見逃さないように厳格に運用しています。
- **CodeQL ワークフロー (`.github/workflows/codeql.yml`)**:
  - `security-extended` および `security-and-quality` クエリを使用して、データフロー解析によるシークレットのハードコード検知や品質チェックなど、高度な静的解析を行います。
- **Zizmor ワークフロー (`.github/workflows/zizmor.yml`)**:
  - `zizmor` を利用して、GitHub Actions ワークフロー自体の脆弱性（インジェクションリスクや不適切な権限設定など）を静的解析し、**検知結果を SARIF として Code scanning に報告します**。本ワークフローが呼び出す reusable workflow (`genzouw/ci-workflows`) は `continue-on-error: true` で実行されるため、検知が発生しても CI はブロックされません。検知内容は Code scanning のアラートとして確認してください。
- **権限 (Permissions) の最小化**:
  - CI の各ワークフロー (`.github/workflows/*.yml`) では `permissions` が明示されており、GitHub Actions が必要以上にリポジトリを書き換える権限を持たないように設計されています。

## 3. 定期監査（継続的棚卸し）

過去の履歴を含めて、見逃しがないかを継続的に監視します。

- **週次スケジュールスキャン**:
  - `gitleaks.yml`、`trufflehog.yml`、および `trivy.yml` には定期実行トリガー（毎週月曜日）が設定されており、Gitコミット履歴全体のスキャンおよび最新の脆弱性情報の取得を自動で行います。TruffleHog は定期監査においても有効なシークレットを継続的に監視します。
- **サプライチェーン・セキュリティ監視 (SBOM生成)**:
  - `sbom.yml` には定期実行トリガー（毎週月曜日）が設定されており、リポジトリ全体のソフトウェア部品表 (SBOM) を自動生成し、GitHub Dependency Graph にアップロードします。これにより、依存関係に起因する脆弱性やサプライチェーンリスクの可視化と管理を行います。
- **ライセンスコンプライアンス監視**:
  - `license-compliance.yml` には定期実行トリガー（毎週月曜日）が設定されており、依存パッケージに商用利用の支障となるライセンス (GPL, AGPL等) が含まれていないかを自動で走査・検証します。
  - 監査ツール本体 (`license-checker-rseidelsohn`) は `package.json` の `devDependencies` と `bun.lock` に固定（ピン留め）されており、`bun install --frozen-lockfile` でインストールされたバージョンを `bunx --no-install` で実行することで、サプライチェーンの再現性を担保しています。
  - `--failOn` はライセンス文字列の完全一致で判定されるため、`GPL` / `AGPL` のような総称ではなく、`GPL-2.0-only` / `GPL-2.0-or-later` / `GPL-3.0-only` / `GPL-3.0-or-later` / `AGPL-3.0-only` / `AGPL-3.0-or-later`（および互換のため旧来の短縮識別子 `GPL-2.0` / `GPL-3.0` / `AGPL-3.0`）といった実際に検出され得る SPDX 識別子を明示的に列挙して検出しています。
  - **既知の制限**: このツールの `--failOn` は単純な文字列完全一致のため、`(MIT OR GPL-3.0-only)` のような複合（デュアルライセンス）の SPDX 式には一致せず、検出漏れとなる場合があります。これはツール側の既知の制約であり、検出結果は必ず `--summary` の出力を目視でも確認してください。

## 開発者の皆様へお願い

- **推奨（リポジトリ管理者向け）**: リポジトリ設定 (Settings > Code security and analysis) から、GitHub ネイティブの **Secret Scanning** と **Push Protection** を有効化することを強く推奨します。これにより、プッシュ時の検知がさらに強化されます（※この設定はリポジトリ管理者のみが変更できます）。
- 本番のシークレットや接続情報（DB、SaaS）を直接コードにハードコードせず、必ず環境変数を使用してください。
- PR 作成時など、誤って秘密情報を含めてしまったことに気づいた場合は、速やかに管理者に連絡し、必要に応じて該当シークレットの無効化（ローテーション）を行ってください。

### GitHub Actions の権限 (Permissions) の最小化

CI の各ワークフロー (`.github/workflows/*.yml`) では、予期せぬスクリプト実行や悪意ある Action からリポジトリを保護するため、**トップレベルでの `permissions` の明示を必須**としています。
未指定の場合、GitHub のデフォルト設定によっては過剰な権限（例: リポジトリの書き換え権限）が与えられる可能性があります。
CI の監査ワークフロー (`.github/workflows/permissions-audit.yml`) にて、全ワークフローファイルが `permissions:` を明示しているかを検査し、漏洩防止の基盤として「最小権限の原則 (Principle of Least Privilege)」を徹底しています。

### CIの対象ブランチ拡張について

シークレット漏洩のリスクは `main` ブランチだけでなく、開発中のフィーチャーブランチにも存在します。そのため、本リポジトリでは `gitleaks` や `trufflehog` によるシークレット検知のスキャンを **すべてのブランチの push 時に実行** するよう設定しています。

### インフラ構成・内部エンドポイントの露出防止

ローカル環境やCI環境の `gitleaks` によるシークレットスキャンにおいて、`.gitleaks.toml` カスタムルール (`monopo-internal-domain`) により、内部インフラ特有のドメイン（例: `.internal`, `.local`, `.corp`, `staging.monopo.com` など）のハードコードを検知・ブロックしています。これにより、意図せぬ社内ネットワーク情報の過剰露出を防ぎます。

### CI ワークフローの権限最小化 (Least Privilege in CI)

リポジトリに対する予期せぬ変更やインジェクション攻撃時の二次被害を防ぐため、`.github/workflows/` 配下の CI ワークフローでは**トップレベルの権限を読み取り専用 (`contents: read` など最小限) に制限**しています。書き込み権限（例: `pull-requests: write`, `security-events: write`）が必要な場合は、トップレベルではなく、その権限を実際に必要とする**ジョブ単位 (`jobs.<job_name>.permissions`) に絞って付与**することを徹底しています。

### pre-push フックの追加 (防御層の強化)

ローカルで `git commit --no-verify` などを用いて pre-commit をバイパスされた場合への最後の防壁として、新たに `.husky/pre-push` フックによる gitleaks 検知を導入しました。これにより、リモートリポジトリへ秘密情報がプッシュされることを水際で防ぎます。

## 4. クライアントサイドの防御 (Client-Side Defense)

- **Referrer-Policy**: `index.html` に `<meta name="referrer" content="no-referrer" />` を設定することで、アプリケーション内から外部リソースを参照した際や外部リンクへ遷移した際に、現在のURLや機密情報がリファラとして外部に漏洩することを防ぎます。

### 追加のセキュリティ要件 (Trivy ブランチ拡張)

シークレット漏洩・設定ミス検知のリスクは `main` ブランチだけでなく、開発中のフィーチャーブランチにも存在します。そのため、本リポジトリでは `trivy` によるスキャンも **全ての PR とすべてのブランチへのプッシュ時に実行** するよう拡張設定しています。

### pull_request_target の使用禁止

フォーク元から悪意のあるコードがシークレット付きで実行されるリスクがあるため、`pull_request_target` トリガーの使用を CI (`permissions-audit.yml`) で明示的に禁止・ブロックしています。

### 追加の漏洩検知・抑止対策 (Pre-commit 強化)

ローカル環境での検知・抑止力をさらに高めるため、`.pre-commit-config.yaml` に **TruffleHog** を追加しました。これにより、有効性が検証可能なシークレット（API キーなど）がコミットされる前にローカル環境で即座に検知・抑止されます。

- **必須**: 開発環境には [TruffleHog](https://github.com/trufflesecurity/trufflehog) をインストールしてください（例: `brew install trufflehog`）。未インストールの場合、コミット時にエラーが発生してブロックされます。
- **オフライン時の回避策**: TruffleHog はデフォルトでシークレットの有効性を外部プロバイダに問い合わせて検証するため、オフライン環境ではコミットが失敗する場合があります。その場合は `SKIP=trufflehog git commit ...` のようにフックを一時的にスキップしてください。

### Dependabot による pre-commit ツールの自動更新

シークレット検知ツール（gitleaks, trufflehog, detect-secrets）を含む `pre-commit` フックのバージョンを常に最新かつ安全に保つため、`.github/dependabot.yml` にて `pre-commit` エコシステムの自動更新を有効化しています。これにより、新しいシークレットパターンへの対応や脆弱性修正が継続的かつ自動で取り込まれ、漏洩防止の防御力が維持されます。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化)

クラウドリソースの識別子（Azure Subscription ID など）や、最新の AI サービストークン（OpenAI Service Account Token など）がコードベースにハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールを拡張しました。
これにより、標準の Gitleaks ルールではカバーしきれない特定のクラウドプロバイダや AI ツールの識別子がローカルおよび CI の双方で早期に検知・ブロックされ、漏洩リスクをさらに低減しています。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化 - 汎用トークン・Basic認証対応)

LINE Messaging API や Notion などの SaaS API キー、および Basic 認証 URL、汎用的な Bearer トークンがコードベースにハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールをさらに拡張しました。
これにより、特定のクラウドプロバイダや AI ツール以外の、一般的な SaaS 連携時のクレデンシャル露出リスクもローカルおよび CI の双方で早期に検知・ブロックされます。

- **Notion API キー**: 2024年9月25日以降に発行される新形式トークン（`ntn_` プレフィックス）と、それ以前から継続利用されているレガシー形式トークン（`secret_` プレフィックス）の両方を検知対象としています。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化 - AI トークン変数名およびデバッグURL検知)

AI エージェントの開発・デバッグ環境に特有の漏洩リスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールを拡張しました。

- **AI トークン変数名の汎用検知**: `GH_MODELS_TOKEN`, `TAVILY_API_KEY` などの AI 関連変数がハードコードされた場合、引用符の有無やドット区切りを含む値の形式によらず検知・ブロックします（変数名は単語境界で厳密に一致させ、`MY_OPENAI_API_KEY` のような部分一致による誤検知は起こしません）。
- **デバッグ用ローカルトンネルURL検知**: `ngrok`, `localtunnel`, `trycloudflare` 等のデバッグ用一時 URL がハードコードされた場合、これを検知・ブロックし、意図せぬ社内ネットワーク情報や一時エンドポイントの露出を防ぎます。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化 - コミュニケーション・デザインツール対応)

Slack や Discord などのコミュニケーションツール、および Figma などのデザインツールの API トークンがコードベースにハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールをさらに拡張しました。
これにより、外部コラボレーションツール連携時のクレデンシャル露出リスクもローカルおよび CI の双方で早期に検知・ブロックされます。

- **Slack Token**: Bot/User/App の各トークン（`xoxb-` / `xoxp-` / `xapp-` 等）に加え、Token Rotation 有効時に発行される `xoxe.xoxp-` / `xoxe.xoxb-` 形式のトークンも検知対象です（Webhook URL は対象外）。
- **Discord**: Bot Token に加え、Webhook URL（`discord.com` / `discordapp.com` の `/api/webhooks/...`）も検知対象です。
- **Figma**: Personal Access Token（`figd_` プレフィックス）のみが検知対象で、Webhook URL は対象外です。

### 追加のカスタム漏洩検知・抑止対策 (Gitleaks 強化 - 最新 AI プロバイダ・Cloudflare 対応)

開発で利用頻度が高まっている新しい AI プロバイダ (Cohere, Mistral, Perplexity, Together AI, Azure OpenAI 等) や VectorDB (Qdrant, Weaviate, Milvus)、および Cloudflare の API トークン・アカウント ID がハードコードされるリスクを防ぐため、リポジトリ直下の `.gitleaks.toml` カスタムルールをさらに拡張しました。
これにより、特定の新しいプロバイダのクレデンシャル露出リスクもローカルおよび CI の双方で早期に検知・ブロックされます。

**検知範囲**: 上記ルール（`monopo-ai-token-assignment-extended` / `monopo-cloudflare-token-assignment`）は、列挙された変数名（例: `COHERE_API_KEY`, `CLOUDFLARE_API_TOKEN` 等）への代入形式かつ値が10文字以上・限定文字集合（英数字・`._-+/=`）の場合のみを検知対象とします。未認識の変数名、10文字未満の値、代入形式でない生のトークン文字列は検知対象外です。また `${...}` のような環境変数参照、`<REDACTED>`、`dummy` 系のプレースホルダー値は許可リストにより検知対象から除外されます。このため、これらのルールのみで漏洩を完全に防げるわけではなく、有効性検証を行う **TruffleHog** や **Secretlint** による補完層と組み合わせて多層的に防御しています（各ツールにもそれぞれ検知の限界があります）。

**マージ前後の確認チェックリスト**:

- [ ] GitHub リポジトリ設定 → Code security and analysis（コードのセキュリティと分析）→ Push protection（プッシュ保護）が有効になっていることを確認する。
- [ ] 開発チーム全体へ、新しいプロバイダの API キーをコミットしないよう周知する。
- [ ] マージ後、次の push / PR で Gitleaks workflow が green になることを確認する。
- [ ] マージ後、ローカルで Gitleaks のフックが新しいルールで動作することを確認する。
