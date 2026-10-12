# 機能提案の索引

マネーゲーム機能の提案は、Issue で管理しています。ロードマップの正本は [#159](https://github.com/genzouw/monopo/issues/159) です。

このディレクトリには、かつて提案ドキュメント（`ISSUE_PROPOSAL_*.md`）が置かれていました。相互参照の破綻と二重管理を解消するため、[#678](https://github.com/genzouw/monopo/issues/678) で削除し、この索引だけを残しています。新しい提案ドキュメントは追加しません。提案は、既存の Issue を確認したうえで Issue として起票してください。

## 削除した提案ドキュメントを読む

削除したファイルは git 履歴に残っています。`NAME` を読みたい提案の名前に置き換えて、削除コミットを探し、その親から読みます。

```bash
# 例: docs/proposals/ISSUE_PROPOSAL_ADVANCED_FINANCIAL_EDUCATION.md を読む
NAME=ADVANCED_FINANCIAL_EDUCATION
FILE="docs/proposals/ISSUE_PROPOSAL_${NAME}.md"
# 削除コミットを探す
COMMIT="$(git log --diff-filter=D --format=%H -1 -- "$FILE")"
# 削除コミットの親から内容を読む
git show "${COMMIT}^:${FILE}"
```

リポジトリ直下にあった `ISSUE_PROPOSAL_ADVANCED_STOCK_SYSTEM.md` と `ISSUE_PROPOSAL_ASSET_MANAGEMENT.md` も同じ手順で読めます。その場合は、`FILE` をリポジトリ直下のパス（`FILE=ISSUE_PROPOSAL_ASSET_MANAGEMENT.md`）にします。

## 提案の受け皿となる Issue

### 提案ドキュメントの整理で起票した Issue

| Issue                                                | 内容                                                                   | 主な出典                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [#816](https://github.com/genzouw/monopo/issues/816) | 税・規制リスク（タックスヘイブン・インサイダー取引・独占禁止法）       | ADVANCED_STOCK_SYSTEM（直下）、ADVANCED_MONEY_GAME、INNOVATIVE_REALITY_MONEY_GAME  |
| [#817](https://github.com/genzouw/monopo/issues/817) | 市場の不透明性（時間外取引・ダークプール・HFT）とミーム株              | DARK_POOLS_AND_HFT、NEXT_GEN_FINANCE、ATTENTION_ECONOMY_AND_MEME_STOCKS            |
| [#818](https://github.com/genzouw/monopo/issues/818) | 金融危機の連鎖（取り付け騒ぎ・CDO・不良債権）                          | FRACTIONAL_RESERVE_BANK_RUN、ADVANCED_MONEY_GAME                                   |
| [#819](https://github.com/genzouw/monopo/issues/819) | 通貨政策（CBDC・マイナス金利・ハイパーインフレとデノミ）               | REALITY_MONEY_GAME、TRADITIONAL_AND_MODERN_MECHANICS                               |
| [#820](https://github.com/genzouw/monopo/issues/820) | LBO（買収ローン）による強制買収の拡張                                  | LBO_FORCED_ACQUISITION                                                             |
| [#821](https://github.com/genzouw/monopo/issues/821) | プラネタリー・バウンダリー（環境負荷メーターと共有地の悲劇）           | INNOVATIVE_EDUCATIONAL_MONEY_GAME                                                  |
| [#822](https://github.com/genzouw/monopo/issues/822) | 債券・調達（社債と信用格付け・ベンチャーデット・コモディティ）         | CORPORATE_BOND_AND_ALTERNATIVE_DATA、CREDIT_AND_VENTURE_DEBT                       |
| [#823](https://github.com/genzouw/monopo/issues/823) | 株主行動（アクティビスト・プロキシファイト・グリーンウォッシュ）       | ITADAKI_AREA_STOCKS_AND_ESG、GREENWASHING_AND_ACTIVIST                             |
| [#824](https://github.com/genzouw/monopo/issues/824) | 救済と保険（クラウド型救済・P2P 保険・再保険）                         | CROWD_BAILOUT、P2P_MICRO_INSURANCE、NEXT_GEN_ASSET_MANAGEMENT                      |
| [#825](https://github.com/genzouw/monopo/issues/825) | 格差と階層移動（不平等なスタートとピケティの r>g）                     | SOCIAL_MOBILITY_AND_INEQUALITY、ADVANCED_FINANCIAL_EDUCATION                       |
| [#826](https://github.com/genzouw/monopo/issues/826) | 影響力（ロビー活動・慈善財団とソフトパワー）                           | PHILANTHROPY_AND_SOFT_POWER、TRADITIONAL_AND_MODERN_MECHANICS                      |
| [#827](https://github.com/genzouw/monopo/issues/827) | 人的資本と新資産（個人トークン化・時間の証券化・宇宙経済・データ経済） | UNPRECEDENTED_MONEY_GAME、NEXT_GEN_ASSET_MANAGEMENT、EVOLUTIONARY_ASSET_MANAGEMENT |
| [#828](https://github.com/genzouw/monopo/issues/828) | 司法リスク（裁判所マス・訴訟・弁護士費用・集団訴訟と和解）             | LEGAL_RISK_AND_LITIGATION                                                          |
| [#210](https://github.com/genzouw/monopo/issues/210) | 信用取引の強制決済の数値仕様（コメントで追記）                         | ADVANCED_STOCK_SYSTEM（直下）                                                      |

### コメントで仕様を追記した既存の Issue

削除した提案のうち、受け皿の Issue に載っていなかった仕様を、既存の Issue へコメントで追記しました。

| Issue                                                | 追記した内容                                                                                        | 主な出典                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [#669](https://github.com/genzouw/monopo/issues/669) | DeFi（AMM・インパーマネント・ロス・ステーキングのロック・監査済み／無監査プール・フラッシュローン） | MARKET_MAKER_AND_LIQUIDITY、INNOVATIVE_FINANCE_AND_TRADITION、NEXT_GEN_FINANCE、ASSET_MANAGEMENT（直下）          |
| [#651](https://github.com/genzouw/monopo/issues/651) | QE/QT、好況時の政策金利の上乗せ、現金保有税、物価指数の扱い                                         | INNOVATIVE_REALITY_MONEY_GAME、MODERN_MONEY_GAME_FEATURES、ASSET_MANAGEMENT（直下）、EDUCATIONAL_ASSET_MANAGEMENT |
| [#672](https://github.com/genzouw/monopo/issues/672) | 年金の賦課方式、メガトレンドと技術革新による陳腐化、救済イベント（徳政令）                          | ADVANCED_FINANCIAL_EDUCATION、COMPREHENSIVE_ECONOMIC_SIMULATION                                                   |
| [#675](https://github.com/genzouw/monopo/issues/675) | 相続税、提案時の税率の例                                                                            | COMPREHENSIVE_WEALTH_EDUCATION、ASSET_MANAGEMENT（直下）                                                          |
| [#670](https://github.com/genzouw/monopo/issues/670) | 損失回避バイアス、デフォルト・ナッジ、FOMO メーターのボーナス                                       | BEHAVIORAL_ECONOMICS_AND_NUDGE、ADVANCED_FINANCIAL_EDUCATION                                                      |
| [#209](https://github.com/genzouw/monopo/issues/209) | スキルタグ、ギグワーク、ジョブホッピング、自己投資の複利                                            | SKILL_CAPITAL_AND_GIG_ECONOMY、NEXT_GEN_ASSET_MANAGEMENT、ASSET_MANAGEMENT（直下）                                |
| [#212](https://github.com/genzouw/monopo/issues/212) | AI 自動化設備と UBI 税                                                                              | NEXT_GEN_FINANCE                                                                                                  |
| [#667](https://github.com/genzouw/monopo/issues/667) | 口単位の分割、カラーグループ単位の REIT 化、トークン投票                                            | ASSET_MANAGEMENT（直下）、INNOVATIVE_REALITY_MONEY_GAME、INNOVATIVE_WEALTH_SIMULATION                             |
| [#668](https://github.com/genzouw/monopo/issues/668) | 両替手数料、レートの更新と再現性                                                                    | EVOLUTIONARY_ASSET_MANAGEMENT                                                                                     |
| [#210](https://github.com/genzouw/monopo/issues/210) | プットオプションとヘッジ                                                                            | COMPREHENSIVE_ECONOMIC_SIMULATION                                                                                 |
| [#159](https://github.com/genzouw/monopo/issues/159) | 段階的導入の方式、周回ボーナス、暗号資産の拡張案                                                    | ADVANCED_FINANCIAL_EDUCATION、TRADITIONAL_AND_MODERN_FINANCE、ITADAKI_AND_MODERN_FINANCE                          |

[#816](https://github.com/genzouw/monopo/issues/816)〜[#827](https://github.com/genzouw/monopo/issues/827) にも、本文に無かった数値と仕様を、コメントで追記しています。

### 既存の Issue がカバーするテーマ

| テーマ                                           | Issue                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| 信用取引・オプション・インデックスファンド       | [#210](https://github.com/genzouw/monopo/issues/210)                       |
| マクロ景気、ローン・信用スコア、保険、敵対的買収 | [#159](https://github.com/genzouw/monopo/issues/159)（2.1・2.2・2.4・1.2） |
| 暗号資産・VC                                     | [#159](https://github.com/genzouw/monopo/issues/159)（2.5）                |
| 累進課税・固定資産税・ESG 控除                   | [#675](https://github.com/genzouw/monopo/issues/675)                       |
| TOB・ホワイトナイト                              | [#677](https://github.com/genzouw/monopo/issues/677)                       |
| REITs・DAO 共同所有                              | [#667](https://github.com/genzouw/monopo/issues/667)                       |
| 為替・多通貨                                     | [#668](https://github.com/genzouw/monopo/issues/668)                       |
| スマートコントラクト・DeFi                       | [#669](https://github.com/genzouw/monopo/issues/669)                       |
| 行動経済学・FOMO・ナッジ                         | [#670](https://github.com/genzouw/monopo/issues/670)                       |
| 地政学・サプライチェーン                         | [#671](https://github.com/genzouw/monopo/issues/671)                       |
| 人口減少・年金                                   | [#672](https://github.com/genzouw/monopo/issues/672)                       |
| NISA 型の非課税口座                              | [#673](https://github.com/genzouw/monopo/issues/673)                       |
| ESG・炭素税                                      | [#666](https://github.com/genzouw/monopo/issues/666)                       |
| マネーサプライ・インフレ                         | [#651](https://github.com/genzouw/monopo/issues/651)                       |
| ベーシックインカム                               | [#212](https://github.com/genzouw/monopo/issues/212)                       |
| 人的資本・ギグエコノミー                         | [#209](https://github.com/genzouw/monopo/issues/209)                       |
| 動的地価                                         | [#211](https://github.com/genzouw/monopo/issues/211)                       |
| 法人化                                           | [#213](https://github.com/genzouw/monopo/issues/213)                       |
| プレイヤー間オークション                         | [#214](https://github.com/genzouw/monopo/issues/214)                       |

## 補足

本文を 1 件ずつ突き合わせた分類ではなく、テーマ名と節見出しから分類しました。受け皿の Issue に載っていない細部は、上記の手順で出典を読んでください。

リポジトリ直下の `PROPOSAL_INNOVATIVE_MONEY_GAME.md` は、この整理の対象外として残しています。
