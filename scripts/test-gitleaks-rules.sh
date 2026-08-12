#!/usr/bin/env bash
# .gitleaks.toml のカスタムルール（monopo-slack-token / monopo-discord-token /
# monopo-figma-token）の検知範囲を固定するための回帰テスト。
#
# 有効なトークン形式のフィクスチャが検知され（true positive）、
# 類似するが無効な値のフィクスチャが誤検知されない（true negative）ことを検証する。
#
# フィクスチャはテスト実行時に一時ディレクトリへ生成し、リポジトリには含めない
# （ダミー値であっても、コミットすると .gitleaks.toml 自身の検知対象になり、
#   本来の秘密情報検知 CI や GitHub の Push Protection を誤って発火させてしまうため）。
# 同じ理由で、このスクリプトのソース上にも「実トークン形式と一致する連続した文字列」
# が残らないよう、各値はプレフィックス・区切り文字・本体を別々の変数に分割し、
# 実行時にのみ連結して組み立てている（base64 化のような単純な難読化は gitleaks 自身の
# base64 自動デコード機能で見破られるため、構造そのものを分割する方式を採る）。
#
# 前提: gitleaks バイナリが PATH 上にインストール済みであること。
#   例: brew install gitleaks / GitHub Releases からダウンロード
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$REPO_ROOT/.gitleaks.toml"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "❌ gitleaks コマンドが見つかりません。インストールしてから再実行してください。" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# --- 組み立て用の断片（単体では実トークン形式に一致しない） ---
d="-"
n10="1234567890"
n13="1234567890123"
rand_a="mQk93XrPz8LdT2wYbNc6Vh0F"
rand_b="j5AgQ7RsWn2Ehf3"
rand_hex="3f9a1c7e2b5d8046f1c9a7b3e5d2f0864c1a7b3e5d2f0864c1a7b3e5d2f08641"
webhook_host="discord.com"
webhook_host_app="discordapp.com"
webhook_path="api/webhooks"
webhook_id="123456789012345678"

# --- 検知対象（true positive）フィクスチャ ---
slack_bot="xoxb${d}${n10}${d}${n10}${d}${rand_a}"
slack_user="xoxp${d}${n10}${d}${n10}${d}${n10}${d}${rand_a}${rand_b:0:4}"
slack_app="xapp${d}1${d}A0${rand_a:0:9}${d}${n13}${d}${rand_hex}"
slack_rotated="xoxe.xoxp${d}1${d}${rand_a}${rand_b}${rand_a}${rand_b}${rand_a}${rand_b}${rand_a}${rand_b:0:5}"
discord_webhook="https://${webhook_host}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
figma_token="figd_${rand_a}${rand_b}"

{
  printf '%s\n' "$slack_bot"
  printf '%s\n' "$slack_user"
  printf '%s\n' "$slack_app"
  printf '%s\n' "$slack_rotated"
  printf '%s\n' "$discord_webhook"
  printf '%s\n' "$figma_token"
} >"$WORKDIR/positive.txt"

# --- 非検知対象（true negative）フィクスチャ: 類似するが無効な値 ---
slack_badtype="xoxz${d}${n10}${d}${n10}${d}${rand_a}"
discord_substr1="https://my${webhook_host_app}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
discord_substr2="https://some${webhook_host}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
figma_badprefix="not${figma_token}"

{
  printf '%s\n' "this-is-not-a-real-token-just-a-word"
  printf '%s\n' "xoxb${d}shortcode"
  printf '%s\n' "myxoxbapptoken${n10}"
  printf '%s\n' "$slack_badtype"
  printf '%s\n' "$discord_substr1"
  printf '%s\n' "$discord_substr2"
  printf '%s\n' "$figma_badprefix"
} >"$WORKDIR/negative.txt"

exit_code=0

echo "── 検知対象フィクスチャのスキャン (monopo-slack/discord/figma-token が検知されること) ──"
pos_report="$WORKDIR/positive-report.json"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/positive.txt" \
  --report-format json --report-path "$pos_report" --exit-code 0 >/dev/null

for rule in monopo-slack-token monopo-discord-token monopo-figma-token; do
  count=$(jq "[.[] | select(.RuleID == \"$rule\")] | length" "$pos_report")
  if [ "$count" -lt 1 ]; then
    echo "❌ $rule が検知対象フィクスチャで検知されませんでした（回帰）"
    exit_code=1
  else
    echo "✅ $rule: ${count}件 検知"
  fi
done

echo ""
echo "── ルール間の重複検知チェック (Figma トークンが monopo-figma-token 以外で検知されないこと) ──"
# figd_ トークンは monopo-modern-paas-token とも正規表現レンジが重複しやすいため、
# 同一トークンが複数の RuleID で検知される（重複アラート）ことがないかを個別に確認する。
figma_report="$WORKDIR/figma-report.json"
printf '%s\n' "$figma_token" >"$WORKDIR/figma-only.txt"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/figma-only.txt" \
  --report-format json --report-path "$figma_report" --exit-code 0 >/dev/null
figma_rule_ids=$(jq -r '[.[].RuleID] | unique | join(",")' "$figma_report")
if [ "$figma_rule_ids" != "monopo-figma-token" ]; then
  echo "❌ Figma トークンが想定外の RuleID セットで検知されました（重複検知の疑い）: $figma_rule_ids"
  exit_code=1
else
  echo "✅ monopo-figma-token のみが検知（monopo-modern-paas-token 等との重複なし）"
fi

echo ""
echo "── 非検知対象フィクスチャのスキャン (誤検知が発生しないこと) ──"
neg_report="$WORKDIR/negative-report.json"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/negative.txt" \
  --report-format json --report-path "$neg_report" --exit-code 0 >/dev/null

for rule in monopo-slack-token monopo-discord-token monopo-figma-token; do
  count=$(jq "[.[] | select(.RuleID == \"$rule\")] | length" "$neg_report")
  if [ "$count" -gt 0 ]; then
    echo "❌ $rule が非検知対象フィクスチャで誤検知されました（${count}件）"
    exit_code=1
  else
    echo "✅ $rule: 誤検知なし"
  fi
done

if [ "$exit_code" -eq 0 ]; then
  echo ""
  echo "✅ すべての回帰テストが成功しました"
else
  echo ""
  echo "❌ 回帰テストに失敗しました" >&2
fi

exit "$exit_code"
