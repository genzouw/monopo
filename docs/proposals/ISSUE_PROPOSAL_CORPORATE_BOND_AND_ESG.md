### 🎯 提案する機能の概要 (What)

既存の提案に含まれていない次の 2 機能に絞って、追加を提案します。

1. 社債発行と信用格付け (Corporate Bonds & Credit Ratings)
2. オルタナティブデータの購入 (Alternative Data)

以下の機能は既存の提案で扱い済みのため、本書では新規に提案せず、参照先へのリンクにとどめます。

| 機能 | 既存の提案 |
| --- | --- |
| ESG・カーボンプライシング（炭素税） | [`ISSUE_PROPOSAL_ADVANCED_MONEY_GAME.md`](ISSUE_PROPOSAL_ADVANCED_MONEY_GAME.md)、[`ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md`](ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md)、[`ISSUE_PROPOSAL_EDUCATIONAL_ASSET_MANAGEMENT.md`](ISSUE_PROPOSAL_EDUCATIONAL_ASSET_MANAGEMENT.md)、[`advanced-money-game-features-proposal.md`](../superpowers/specs/advanced-money-game-features-proposal.md) |
| スマートコントラクト | [`ISSUE_PROPOSAL_NEXT_GEN_FINANCE.md`](ISSUE_PROPOSAL_NEXT_GEN_FINANCE.md)、[`ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md`](ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md)、[`ISSUE_PROPOSAL_MODERN_EDUCATIONAL_MONEY_GAME.md`](ISSUE_PROPOSAL_MODERN_EDUCATIONAL_MONEY_GAME.md) |
| アルゴリズム取引 | [`ISSUE_PROPOSAL_NEXT_GEN_FINANCE.md`](ISSUE_PROPOSAL_NEXT_GEN_FINANCE.md)、[`ISSUE_PROPOSAL_REALITY_MONEY_GAME.md`](ISSUE_PROPOSAL_REALITY_MONEY_GAME.md)、[`ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md`](ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md) |

### ⚙️ ゲーム内での具体的なメカニクス (How)

- **社債発行と信用格付け:**
  - プレイヤーは自身の信用格付け（総資産、負債比率、過去のデフォルト履歴等からシステムが算出）に基づき、資金調達の手段として「社債」を発行できる。
  - 格付けが高いほど低い金利で多額の資金を調達できるが、低い場合は高利回りのジャンク債（ハイイールド債）となる。
  - 発行された社債は他プレイヤーが購入可能。発行者は毎ターン利息を支払い、満期時に元本を償還する。償還不能時は強制的に資産が売却されるかデフォルトとなり、格付けが大幅に低下する。
  - 既存提案の炭素税・ESG と組み合わせる場合は、ESG スコアの高いエリアを対象とした「グリーンボンド」の発行条件を有利にする拡張を、別途その提案側で検討する。
- **オルタナティブデータの購入:**
  - プレイヤーはお金を払い、ゲーム内の「オルタナティブデータ（他のプレイヤーのサイコロの出目の偏り、特定のエリアへの滞在頻度、現金の保有割合など）」を購入できる。
  - 購入したデータは、社債の購入判断（発行者のデフォルト可能性の見積もり）や、エリアの買収提案の判断材料として使う。自動売買ボットへの連携は既存のアルゴリズム取引の提案に委ねる。

### 🎓 教材としての教育的効果 (Why it is educational)

- **資金調達の多様性と信用リスク:** 株式や銀行借り入れ以外の手段（社債）と、それに伴う信用リスク（ジャンク債の危険性）や格付け機関の役割を学習できる。
- **情報の非対称性と情報の価値:** 対価を払って得るデータが投資判断の精度をどれだけ上げるかを通じて、情報コストと投資判断の関係を体感できる。

### ⚖️ ゲームバランスへの影響と懸念点

- **複雑性とUIの課題:** 社債の発行条件・利払い・償還のスケジュールを一目で把握できるダッシュボードUIが必要。
- **初心者の参入障壁:** 新しい概念が多いため、初心者向けの「ベーシックモード」とは分離し、「アドバンスドモード（または現代経済モード）」の機能として提供することが推奨される。
- **デフォルト連鎖のリスク:** 社債のデフォルトが購入者側の資産にも波及し、特定プレイヤーの脱落が早まる可能性がある。1 発行あたりの上限額や、購入者ごとの保有上限を設けて緩和する。
