# Security Policy

## Reporting a Vulnerability

このリポジトリで脆弱性を発見された場合は、**公開 Issue / PR / Discussion での報告は行わないでください**。

以下のいずれかの方法で **非公開** にてご連絡ください。

- **GitHub Security Advisories（推奨）**
  - <https://github.com/genzouw/monopo/security/advisories/new>
  - GitHub の "Private vulnerability reporting" 機能を使い、メンテナーと非公開でやり取りできます。
- **Email**
  - `genzouw@gmail.com`

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
