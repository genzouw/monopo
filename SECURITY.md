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

- **ローカル検知**: `.husky/pre-commit` フックにより、`gitleaks` を用いたコミット前のシークレット混入検知を必須化しています。
- **CI 検知**: GitHub Actions にて `gitleaks`、`trivy`、`trufflehog` を用い、PR差分およびリポジトリ全体の履歴・依存関係に含まれるシークレットを自動スキャンしています。また、`actionlint` を `shellcheck` と連携させ、CI スクリプト経由での意図しないトークン漏洩（インジェクション）を防いでいます。
- **定期監査**: 週次ベースでリポジトリ全体のフルスキャンを自動実行し、設定ミスによる新たな漏洩リスクを継続的に監視しています。

### GitHub Secret Scanning と Push Protection の推奨 (リポジトリ管理者向け)

リポジトリ管理者に対して、GitHub ネイティブの [Secret Scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning) および [Push Protection](https://docs.github.com/code-security/secret-scanning/protecting-pushes-with-secret-scanning) をリポジトリ設定画面から有効化することを強く推奨します。これにより、ローカルのチェックをすり抜けたシークレットも push 時にサーバー側でブロックされます。
