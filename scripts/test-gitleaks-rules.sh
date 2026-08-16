#!/usr/bin/env bash
# .gitleaks.toml のカスタムルール（monopo-slack-token / monopo-discord-token /
# monopo-figma-token / monopo-ai-token-assignment-extended /
# monopo-cloudflare-token-assignment / monopo-frontend-exposed-secret）の検知範囲を
# 固定するための回帰テスト。
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
rand_a="mQk93XrPz8LdT2wYbNc6Vh0F"  # pragma: allowlist secret
rand_b="j5AgQ7RsWn2Ehf3"  # pragma: allowlist secret
rand_hex="3f9a1c7e2b5d8046f1c9a7b3e5d2f0864c1a7b3e5d2f0864c1a7b3e5d2f08641"  # pragma: allowlist secret
webhook_host="discord.com"
webhook_host_app="discordapp.com"
webhook_path="api/webhooks"
webhook_id="123456789012345678"

# --- 変数名ベースルール（monopo-ai-token-assignment-extended /
#     monopo-cloudflare-token-assignment / monopo-frontend-exposed-secret）組み立て用の断片 ---
eq="="
qt='"'
ai_var="COHERE_API_KEY"
cf_var="CLOUDFLARE_API_TOKEN"
vertex_var="VERTEX_AI_CREDENTIALS"
frontend_var="NEXT_PUBLIC_OPENAI_API_KEY"
ai_var_suffix_only="MY_${ai_var}"  # \b の単語境界チェック用（部分一致で誤検知しないこと）
env_ref_val='${COHERE_API_KEY}'
redacted_val="<REDACTED>"
dummy_val="dummy-token"

# --- 検知対象（true positive）フィクスチャ ---
slack_bot="xoxb${d}${n10}${d}${n10}${d}${rand_a}"
slack_user="xoxp${d}${n10}${d}${n10}${d}${n10}${d}${rand_a}${rand_b:0:4}"
slack_app="xapp${d}1${d}A0${rand_a:0:9}${d}${n13}${d}${rand_hex}"
slack_rotated="xoxe.xoxp${d}1${d}${rand_a}${rand_b}${rand_a}${rand_b}${rand_a}${rand_b}${rand_a}${rand_b:0:5}"
discord_webhook="https://${webhook_host}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
figma_token="figd_${rand_a}${rand_b}"
ai_assignment="${ai_var}${eq}${qt}${rand_a}${qt}"
cf_assignment="${cf_var}${eq}${qt}${rand_b}${rand_a:0:10}${qt}"
frontend_assignment="${frontend_var}${eq}${qt}${rand_a}${qt}"
# VERTEX_AI_CREDENTIALS へのアクセストークン/認証情報値の直接代入（ファイルパス形状ではない）は
# 検知対象とする（ファイルパス形状の値のみ allowlist で除外する。下記 vertex_path_assignment 参照）
vertex_assignment="${vertex_var}${eq}${qt}${rand_b}${rand_a:0:12}${qt}"
# サービスアカウント JSON をそのまま直接代入したケース（monopo-vertex-ai-credentials-json で検知）
vertex_json_assignment="${vertex_var}${eq}${qt}{${qt}type${qt}:${qt}service_account${qt},${qt}private_key${qt}:${qt}${rand_a}${rand_b}${qt}}${qt}"

{
  printf '%s\n' "$slack_bot"
  printf '%s\n' "$slack_user"
  printf '%s\n' "$slack_app"
  printf '%s\n' "$slack_rotated"
  printf '%s\n' "$discord_webhook"
  printf '%s\n' "$figma_token"
  printf '%s\n' "$ai_assignment"
  printf '%s\n' "$cf_assignment"
  printf '%s\n' "$frontend_assignment"
  printf '%s\n' "$vertex_assignment"
  printf '%s\n' "$vertex_json_assignment"
} >"$WORKDIR/positive.txt"

# --- 非検知対象（true negative）フィクスチャ: 類似するが無効な値 ---
slack_badtype="xoxz${d}${n10}${d}${n10}${d}${rand_a}"
discord_substr1="https://my${webhook_host_app}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
discord_substr2="https://some${webhook_host}/${webhook_path}/${webhook_id}/${rand_a}${rand_b}${rand_a}"
figma_badprefix="not${figma_token}"
ai_short_assignment="${ai_var}${eq}${qt}${rand_a:0:9}${qt}"  # 9文字（10文字未満）
ai_unknown_assignment="${ai_var_suffix_only}${eq}${qt}${rand_a}${qt}"  # 変数名が部分一致のみ
ai_envref_assignment="${ai_var}${eq}${env_ref_val}"  # ${...} 参照は許可リスト対象
ai_redacted_assignment="${ai_var}${eq}${qt}${redacted_val}${qt}"  # <REDACTED> は許可リスト対象
ai_dummy_assignment="${ai_var}${eq}${qt}${dummy_val}${qt}"  # dummy 系は許可リスト対象
vertex_path_assignment="${vertex_var}${eq}${qt}./keys/vertex.json${qt}"  # ファイルパス形状の値は allowlist で除外
# 中括弧内が10文字未満の JSON 風の値は monopo-vertex-ai-credentials-json でも検知しないことの回帰ケース
vertex_json_short="${vertex_var}${eq}${qt}{${qt}a${qt}:${qt}1${qt}}${qt}"
frontend_short_assignment="${frontend_var}${eq}${qt}${rand_a:0:9}${qt}"  # 9文字（10文字未満）
# 機密キーワードを含まない公開プレフィックス変数（クライアントに公開して問題ない設定値）は検知対象外
frontend_public_assignment="EXPO_PUBLIC_APP_TITLE${eq}${qt}${rand_a}${qt}"
# ${...} 参照・dummy 系プレースホルダーはフロントエンド公開プレフィックスルールの allowlist 対象
frontend_envref_assignment="${frontend_var}${eq}${env_ref_val}"
frontend_dummy_assignment="NUXT_PUBLIC_DATABASE_PASSWORD${eq}${qt}dummy-password${qt}"
# Firebase Web の authDomain / Auth0 SPA の domain・clientId は仕様上クライアントに
# 公開される値であり、monopo-frontend-exposed-secret の allowlist（match target）で除外される
# 値は secret target の許可プレースホルダー（^(?:your|my|change-me|placeholder|sample|example|todo)...）に
# 先に一致しないよう、"my" 等で始まらない値を使う（そうでないと match target の
# ドメイン/clientId allowlist を一度も通らずに negative 判定となり、回帰対象を検証できない）
frontend_firebase_auth_domain="GATSBY_FIREBASE_AUTH_DOMAIN${eq}${qt}acme-1234.firebaseapp.com${qt}"
frontend_auth0_client_id="NEXT_PUBLIC_AUTH0_CLIENT_ID${eq}${qt}${rand_a}${qt}"
# 認証ドメイン allowlist（.gitleaks.toml Line 393）は AUTH0_DOMAIN について、検知側 regex と
# 同じ9種のプレフィックス（VITE / NEXT_PUBLIC / EXPO_PUBLIC / NUXT_PUBLIC / GATSBY /
# REACT_APP / VUE_APP / NG_APP / PUBLIC）と、区切り文字 ":" "=" の両方を許可対象とする。
# 一部のプレフィックス・区切りだけを検証すると、他の組み合わせで allowlist が縮小する回帰
# （例: 特定プレフィックスだけ除外漏れになる）に気づけないため、全9プレフィックス×2区切りを
# 個別フィクスチャとして固定する。
colon=":"
auth0_domain_prefixes=(VITE NEXT_PUBLIC EXPO_PUBLIC NUXT_PUBLIC GATSBY REACT_APP VUE_APP NG_APP PUBLIC)
auth0_domain_fixtures=()
for auth0_domain_prefix in "${auth0_domain_prefixes[@]}"; do
  auth0_domain_fixtures+=("${auth0_domain_prefix}_AUTH0_DOMAIN${eq}${qt}dev-abc123.us.auth0.com${qt}")
  auth0_domain_fixtures+=("${auth0_domain_prefix}_AUTH0_DOMAIN${colon} ${qt}dev-abc123.us.auth0.com${qt}")
done
# .env.example で使われる定番プレースホルダーは allowlist（secret target）で除外される
frontend_placeholder_your="EXPO_PUBLIC_API_TOKEN${eq}${qt}your_token_here${qt}"
frontend_placeholder_changeme="NEXT_PUBLIC_APP_SECRET${eq}${qt}CHANGE_ME_PLEASE${qt}"
# 値の末尾に許可文字集合外の文字（!）が続く場合、接頭辞だけで検知しないことの回帰ケース
# （例: COHERE_API_KEY="abcdefghij!" は "abcdefghij" として誤検知されてはならない） # pragma: allowlist secret
ai_boundary_assignment="${ai_var}${eq}${qt}${rand_a:0:10}!${qt}"
ai_boundary_assignment_unquoted="${ai_var}${eq}${rand_a:0:10}!"
# プレースホルダー allowlist は代入系3ルール（monopo-ai-token-assignment-extended /
# monopo-cloudflare-token-assignment / monopo-frontend-exposed-secret）で同一内容に
# 同期する必要がある。同期が崩れると、同じ値が「AI キーだと検知され、フロントエンド変数だと
# 除外される」といったルール間の非対称を生み、`.env.example` やオンボーディング手順への
# 例示がルール次第でブロックされる。3ルールへ同じプレースホルダー値を与えて非検知を固定する。
placeholder_shared_val="your${d}key${d}here"
ai_placeholder_assignment="CURSOR_API_KEY${eq}${qt}${placeholder_shared_val}${qt}"
cf_placeholder_assignment="${cf_var}${eq}${qt}${placeholder_shared_val}${qt}"
frontend_placeholder_shared="VITE_APP_SECRET${eq}${qt}${placeholder_shared_val}${qt}"

{
  printf '%s\n' "this-is-not-a-real-token-just-a-word"
  printf '%s\n' "xoxb${d}shortcode"
  printf '%s\n' "myxoxbapptoken${n10}"
  printf '%s\n' "$slack_badtype"
  printf '%s\n' "$discord_substr1"
  printf '%s\n' "$discord_substr2"
  printf '%s\n' "$figma_badprefix"
  printf '%s\n' "$ai_short_assignment"
  printf '%s\n' "$ai_unknown_assignment"
  printf '%s\n' "$ai_envref_assignment"
  printf '%s\n' "$ai_redacted_assignment"
  printf '%s\n' "$ai_dummy_assignment"
  printf '%s\n' "$ai_boundary_assignment"
  printf '%s\n' "$ai_boundary_assignment_unquoted"
  printf '%s\n' "$vertex_path_assignment"
  printf '%s\n' "$vertex_json_short"
  printf '%s\n' "$frontend_short_assignment"
  printf '%s\n' "$frontend_public_assignment"
  printf '%s\n' "$frontend_envref_assignment"
  printf '%s\n' "$frontend_dummy_assignment"
  printf '%s\n' "$frontend_firebase_auth_domain"
  printf '%s\n' "$frontend_auth0_client_id"
  for auth0_domain_fixture in "${auth0_domain_fixtures[@]}"; do
    printf '%s\n' "$auth0_domain_fixture"
  done
  printf '%s\n' "$frontend_placeholder_your"
  printf '%s\n' "$frontend_placeholder_changeme"
  printf '%s\n' "$ai_placeholder_assignment"
  printf '%s\n' "$cf_placeholder_assignment"
  printf '%s\n' "$frontend_placeholder_shared"
} >"$WORKDIR/negative.txt"

exit_code=0

echo "── 検知対象フィクスチャのスキャン (monopo-slack/discord/figma-token/ai-token-assignment-extended/cloudflare-token-assignment/vertex-ai-credentials-json/frontend-exposed-secret が検知されること) ──"
pos_report="$WORKDIR/positive-report.json"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/positive.txt" \
  --report-format json --report-path "$pos_report" --exit-code 0 >/dev/null

for rule in monopo-slack-token monopo-discord-token monopo-figma-token monopo-ai-token-assignment-extended monopo-cloudflare-token-assignment monopo-vertex-ai-credentials-json monopo-frontend-exposed-secret; do
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
echo "── 認証ドメイン allowlist の限定チェック (Firebase/Auth0 以外の AUTH*_DOMAIN 変数は allowlist 対象外で検知されること) ──"
# monopo-frontend-exposed-secret の allowlist（match target）は、Firebase の authDomain と
# Auth0 の domain（FIREBASE_AUTH_DOMAIN / AUTH0_DOMAIN への完全一致）のみを除外対象とする。
# 「AUTH」と「_DOMAIN」を含む任意の変数名まで広く除外すると、PRIVATE 等の機密キーワードを
# 含む変数（例: NEXT_PUBLIC_PRIVATE_AUTH_DOMAIN）まで検知漏れとなるため、その回帰を防ぐ。
auth_domain_leak="NEXT_PUBLIC_PRIVATE_AUTH_DOMAIN${eq}${qt}${rand_a}${qt}"
auth_domain_report="$WORKDIR/auth-domain-report.json"
printf '%s\n' "$auth_domain_leak" >"$WORKDIR/auth-domain.txt"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/auth-domain.txt" \
  --report-format json --report-path "$auth_domain_report" --exit-code 0 >/dev/null
auth_domain_count=$(jq '[.[] | select(.RuleID == "monopo-frontend-exposed-secret")] | length' "$auth_domain_report")
if [ "$auth_domain_count" -lt 1 ]; then
  echo "❌ NEXT_PUBLIC_PRIVATE_AUTH_DOMAIN が monopo-frontend-exposed-secret として検知されませんでした（allowlist が広すぎる回帰）"
  exit_code=1
else
  echo "✅ NEXT_PUBLIC_PRIVATE_AUTH_DOMAIN が monopo-frontend-exposed-secret として検知されました（Firebase/Auth0 以外の AUTH*_DOMAIN は allowlist 対象外）"
fi

echo ""
echo "── 認証ドメイン allowlist のバイパス防止チェック (許可変数名を無関係な秘密値へ埋め込んでも検知が回避されないこと) ──"
# 認証ドメイン allowlist（match target）は match の先頭（変数名の直後）に一致することを必須とする
# （^ アンカー + [[:space:]]* + "="）。アンカーが無いと、allowlist 対象外の秘密変数（例:
# NEXT_PUBLIC_APP_SECRET）の値の中に許可変数名の文字列を埋め込むだけで（例:
# NEXT_PUBLIC_APP_SECRET="VITE_AUTH0_DOMAIN=<secret>"）allowlist が誤って一致し、 # pragma: allowlist secret
# 本来検知すべき秘密の検知を回避できてしまう。その回帰を防ぐ。
auth_domain_bypass="NEXT_PUBLIC_APP_SECRET${eq}${qt}VITE_AUTH0_DOMAIN${eq}${rand_a}${qt}"
auth_domain_bypass_report="$WORKDIR/auth-domain-bypass-report.json"
printf '%s\n' "$auth_domain_bypass" >"$WORKDIR/auth-domain-bypass.txt"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/auth-domain-bypass.txt" \
  --report-format json --report-path "$auth_domain_bypass_report" --exit-code 0 >/dev/null
auth_domain_bypass_count=$(jq '[.[] | select(.RuleID == "monopo-frontend-exposed-secret")] | length' "$auth_domain_bypass_report")
if [ "$auth_domain_bypass_count" -lt 1 ]; then
  echo "❌ 許可変数名を値に埋め込んだ NEXT_PUBLIC_APP_SECRET が monopo-frontend-exposed-secret として検知されませんでした（allowlist バイパスの回帰）"
  exit_code=1
else
  echo "✅ 許可変数名を値に埋め込んでも monopo-frontend-exposed-secret として検知されました（allowlist の先頭アンカーが機能）"
fi

echo ""
echo "── プレースホルダー allowlist の過剰一致防止チェック (プレースホルダー語で始まるだけの実在値が区切り文字の有無に関わらず除外されないこと) ──"
# プレースホルダー allowlist（secret target）は、「プレースホルダー語だけを区切り文字
# （- / _ / .）で連結した値」にのみ一致する。以下2形状の実在シークレットが除外されない
# ことを固定する。
#   1. 区切り無し: `my` / `example` / `sample` で始まるだけの camelCase 値
#   2. 区切りあり: プレースホルダー語 + 区切り文字の後にプレースホルダー語以外が続く値
# 特に 2 は、区切りの後を自由な文字集合（[a-z0-9._-]*）で受けると値の残り全体を飲み込み、
# `my-real-production-token-...` のような実在シークレットが素通りする。その回帰を防ぐ。
placeholder_prefixed_secret="NEXT_PUBLIC_APP_SECRET${eq}${qt}my${rand_a}${qt}"  # pragma: allowlist secret
# 区切り文字ありの実在値（プレースホルダー語 "my" + "-" + プレースホルダー語ではない本体）
placeholder_delimited_secret="EXPO_PUBLIC_API_TOKEN${eq}${qt}my${d}real${d}production${d}${rand_a}${qt}"  # pragma: allowlist secret
placeholder_prefixed_report="$WORKDIR/placeholder-prefixed-report.json"
{
  printf '%s\n' "$placeholder_prefixed_secret"
  printf '%s\n' "$placeholder_delimited_secret"
} >"$WORKDIR/placeholder-prefixed.txt"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/placeholder-prefixed.txt" \
  --report-format json --report-path "$placeholder_prefixed_report" --exit-code 0 >/dev/null
for placeholder_line in 1 2; do
  case "$placeholder_line" in
  1) placeholder_label="区切り無しでプレースホルダー語で始まるだけの実在値" ;;
  2) placeholder_label="プレースホルダー語 + 区切り文字に続く実在値" ;;
  esac
  placeholder_prefixed_count=$(jq "[.[] | select(.RuleID == \"monopo-frontend-exposed-secret\" and .StartLine == $placeholder_line)] | length" "$placeholder_prefixed_report")
  if [ "$placeholder_prefixed_count" -lt 1 ]; then
    echo "❌ ${placeholder_label}が monopo-frontend-exposed-secret として検知されませんでした（allowlist が広すぎる回帰）"
    exit_code=1
  else
    echo "✅ ${placeholder_label}が monopo-frontend-exposed-secret として検知されました（allowlist はプレースホルダー語の連結のみ許可）"
  fi
done

echo ""
echo "── 列挙された変数名を個別に回帰テスト (各変数名が対応する RuleID・検知行と一致すること) ──"
# 代表1変数の検知だけでは、他の列挙名の正規表現（例: MISTRAL_API_KEY 等）が壊れても
# 気づけない。列挙された全変数名を1行ずつのフィクスチャとして生成し、行番号ベースで
# 期待する RuleID と実際の検知行が一致するかを個別に確認する。
ai_vars=(COHERE_API_KEY MISTRAL_API_KEY PERPLEXITY_API_KEY TOGETHER_API_KEY GEMINI_API_KEY VERTEX_AI_CREDENTIALS AZURE_OPENAI_API_KEY AZURE_OPENAI_KEY QDRANT_API_KEY WEAVIATE_API_KEY MILVUS_API_KEY CURSOR_API_KEY WINDSURF_API_KEY CLINE_API_KEY CODEIUM_API_KEY)
cf_vars=(CLOUDFLARE_API_KEY CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_ZONE_ID CF_API_KEY CF_API_TOKEN)
# monopo-frontend-exposed-secret は変数名の「完全一致」ではなく、NEXT_PUBLIC_ 等のプレフィックス配下の
# キーワード（SECRET / PASSWORD / OPENAI 等）の部分一致で検知する。キーワードごとに分岐が
# 存在するため、代表1変数（NEXT_PUBLIC_OPENAI_API_KEY）の検知だけでは他のキーワード分岐が壊れても
# 気づけない。正規表現に列挙された全キーワードを1つずつ網羅する変数名を生成して検証する。
# プレフィックスは正規表現に列挙された9種（VITE / NEXT_PUBLIC / EXPO_PUBLIC / NUXT_PUBLIC /
# GATSBY / REACT_APP / VUE_APP / NG_APP / PUBLIC）をキーワード16種へラウンドロビンで割り当て、
# 全プレフィックスが最低1回は検証されるようにしている。プレフィックスを増減させた場合は
# この割り当ても回し直すこと。
frontend_vars=(
  VITE_APP_SECRET                 # SECRET      / VITE
  NEXT_PUBLIC_PRIVATE_KEY         # PRIVATE     / NEXT_PUBLIC
  EXPO_PUBLIC_DATABASE_PASSWORD   # PASSWORD    / EXPO_PUBLIC
  NUXT_PUBLIC_GCP_CREDENTIAL      # CREDENTIAL  / NUXT_PUBLIC
  GATSBY_BASIC_AUTH               # AUTH        / GATSBY
  REACT_APP_ACCESS_TOKEN          # TOKEN       / REACT_APP
  VUE_APP_STRIPE_API_KEY          # API_KEY     / VUE_APP
  NG_APP_OPENAI_API_KEY           # OPENAI      / NG_APP
  PUBLIC_ANTHROPIC_KEY            # ANTHROPIC   / PUBLIC
  VITE_COHERE_KEY                 # COHERE      / VITE
  NEXT_PUBLIC_MISTRAL_KEY         # MISTRAL     / NEXT_PUBLIC
  EXPO_PUBLIC_GEMINI_KEY          # GEMINI      / EXPO_PUBLIC
  NUXT_PUBLIC_TAVILY_KEY          # TAVILY      / NUXT_PUBLIC
  GATSBY_GROQ_KEY                 # GROQ        / GATSBY
  REACT_APP_DEEPSEEK_KEY          # DEEPSEEK    / REACT_APP
  VUE_APP_SUPABASE_SERVICE_ROLE   # SERVICE_ROLE / VUE_APP
)

per_var_fixture="$WORKDIR/per-var.txt"
: >"$per_var_fixture"
for var in "${ai_vars[@]}"; do
  printf '%s%s%s%s%s%s\n' "$var" "$eq" "$qt" "$rand_a" "${rand_b:0:2}" "$qt" >>"$per_var_fixture"
done
for var in "${cf_vars[@]}"; do
  printf '%s%s%s%s%s%s\n' "$var" "$eq" "$qt" "$rand_b" "${rand_a:0:10}" "$qt" >>"$per_var_fixture"
done
for var in "${frontend_vars[@]}"; do
  printf '%s%s%s%s%s%s\n' "$var" "$eq" "$qt" "$rand_a" "${rand_b:0:2}" "$qt" >>"$per_var_fixture"
done

per_var_report="$WORKDIR/per-var-report.json"
gitleaks detect --no-git --config "$CONFIG" --source "$per_var_fixture" \
  --report-format json --report-path "$per_var_report" --exit-code 0 >/dev/null

line_no=0
for var in "${ai_vars[@]}"; do
  line_no=$((line_no + 1))
  match_count=$(jq "[.[] | select(.RuleID == \"monopo-ai-token-assignment-extended\" and .StartLine == $line_no)] | length" "$per_var_report")
  if [ "$match_count" -ne 1 ]; then
    echo "❌ ${var} (${line_no}行目) が monopo-ai-token-assignment-extended として検知されませんでした"
    exit_code=1
  else
    echo "✅ ${var} (${line_no}行目): monopo-ai-token-assignment-extended として検知"
  fi
done
for var in "${cf_vars[@]}"; do
  line_no=$((line_no + 1))
  match_count=$(jq "[.[] | select(.RuleID == \"monopo-cloudflare-token-assignment\" and .StartLine == $line_no)] | length" "$per_var_report")
  if [ "$match_count" -ne 1 ]; then
    echo "❌ ${var} (${line_no}行目) が monopo-cloudflare-token-assignment として検知されませんでした"
    exit_code=1
  else
    echo "✅ ${var} (${line_no}行目): monopo-cloudflare-token-assignment として検知"
  fi
done
for var in "${frontend_vars[@]}"; do
  line_no=$((line_no + 1))
  match_count=$(jq "[.[] | select(.RuleID == \"monopo-frontend-exposed-secret\" and .StartLine == $line_no)] | length" "$per_var_report")
  if [ "$match_count" -ne 1 ]; then
    echo "❌ ${var} (${line_no}行目) が monopo-frontend-exposed-secret として検知されませんでした"
    exit_code=1
  else
    echo "✅ ${var} (${line_no}行目): monopo-frontend-exposed-secret として検知"
  fi
done

echo ""
echo "── 非検知対象フィクスチャのスキャン (誤検知が発生しないこと) ──"
neg_report="$WORKDIR/negative-report.json"
gitleaks detect --no-git --config "$CONFIG" --source "$WORKDIR/negative.txt" \
  --report-format json --report-path "$neg_report" --exit-code 0 >/dev/null

for rule in monopo-slack-token monopo-discord-token monopo-figma-token monopo-ai-token-assignment-extended monopo-cloudflare-token-assignment monopo-vertex-ai-credentials-json monopo-frontend-exposed-secret; do
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
