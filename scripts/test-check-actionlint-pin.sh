#!/usr/bin/env bash
# scripts/check-actionlint-pin.sh の awk/sed 抽出ロジックを固定するための回帰テスト。
#
# check-actionlint-pin.sh は .pre-commit-config.yaml の rhysd/actionlint フックについて、
# rev（フック定義のタグ）と entry（Dockerイメージのタグ・digest）の整合を検証するが、
# その抽出ロジック（awk によるブロック切り出し、sed によるバージョン/digest抽出）自体は
# .pre-commit-config.yaml のフォーマット変更で静かに壊れうる。scripts/test-gitleaks-rules.sh
# と同じ考え方（フィクスチャによる true positive / true negative の固定）で、
# 以下のパターンが期待どおりの終了コード・メッセージになることを検証する：
#   1. 正常系（rev と entry のバージョンが一致）
#   2. rev 不一致
#   3. digest 欠落（entry に @sha256:... が無い）
#   4. repo ブロック消失（rhysd/actionlint のフック定義自体が無い）
#   5. digest 形式が厳密でない（64桁の digest 直後に余分な文字列が続く）
#
# フィクスチャは一時ディレクトリへ生成し、リポジトリには含めない。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_SCRIPT="$REPO_ROOT/scripts/check-actionlint-pin.sh"

if [ ! -x "$TARGET_SCRIPT" ]; then
  echo "❌ $TARGET_SCRIPT が見つからないか実行権限がありません。" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# 実際の .pre-commit-config.yaml で使われている digest（rhysd/actionlint:1.7.12 に対応）。
# 秘密情報ではなく公開 Docker イメージの manifest digest であり、ダミー値ではなく実際の
# 64桁16進文字列としての妥当性を検証するためにそのまま使用する。
DIGEST="b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667"

# 他フックのブロックも1つ挟み、「次の - repo: 行が現れたらブロック外」という
# awk 側のブロック終端判定が正しく効くことも併せて確認する。
other_repo_block() {
  cat <<'EOF'
  - repo: https://github.com/example/other-hook
    rev: v9.9.9
    hooks:
      - id: other-hook
EOF
}

write_config() {
  local file="$1"
  local actionlint_block="$2"
  {
    printf 'repos:\n'
    printf '%s\n' "$actionlint_block"
    other_repo_block
  } >"$file"
}

exit_code=0

assert_case() {
  local label="$1"
  local config="$2"
  local expected_status="$3"
  local expected_pattern="$4"

  local output
  local status=0
  output="$("$TARGET_SCRIPT" "$config" 2>&1)" || status=$?

  if [ "$status" -ne "$expected_status" ]; then
    echo "❌ ${label}: 終了コードが期待と異なります（実際: ${status} / 期待: ${expected_status}）"
    echo "   出力: ${output}"
    exit_code=1
    return
  fi

  if ! printf '%s' "$output" | grep -qF -- "$expected_pattern"; then
    echo "❌ ${label}: 出力に期待するメッセージが含まれていません（期待: 「${expected_pattern}」）"
    echo "   出力: ${output}"
    exit_code=1
    return
  fi

  echo "✅ ${label}: 終了コード ${status}、期待するメッセージを含む出力"
}

echo "── 1. 正常系（rev と entry のバージョンが一致） ──"
ok_config="$WORKDIR/ok.yaml"
write_config "$ok_config" "$(
  cat <<EOF
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.12
    hooks:
      - id: actionlint-docker
        entry: docker.io/rhysd/actionlint:1.7.12@sha256:${DIGEST}
EOF
)"
assert_case "正常系" "$ok_config" 0 "✅ actionlint のバージョン固定は整合しています (v1.7.12)"

echo ""
echo "── 2. rev 不一致（rev は v1.7.13 だが entry は 1.7.12 のまま） ──"
mismatch_config="$WORKDIR/mismatch.yaml"
write_config "$mismatch_config" "$(
  cat <<EOF
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.13
    hooks:
      - id: actionlint-docker
        entry: docker.io/rhysd/actionlint:1.7.12@sha256:${DIGEST}
EOF
)"
assert_case "rev不一致" "$mismatch_config" 1 "actionlint の rev と Docker イメージのバージョンが一致していません"

echo ""
echo "── 3. digest 欠落（entry に @sha256:... が無い） ──"
missing_digest_config="$WORKDIR/missing-digest.yaml"
write_config "$missing_digest_config" "$(
  cat <<'EOF'
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.12
    hooks:
      - id: actionlint-docker
        entry: docker.io/rhysd/actionlint:1.7.12
EOF
)"
assert_case "digest欠落" "$missing_digest_config" 1 "actionlint-docker の entry を読み取れませんでした"

echo ""
echo "── 4. repo ブロック消失（rhysd/actionlint のフック定義自体が無い） ──"
missing_block_config="$WORKDIR/missing-block.yaml"
{
  printf 'repos:\n'
  other_repo_block
} >"$missing_block_config"
assert_case "ブロック消失" "$missing_block_config" 1 "rhysd/actionlint の repo ブロックが見つかりません"

echo ""
echo "── 5. digest 形式が厳密でない（64桁の digest 直後に余分な文字列が続く） ──"
# scripts/check-actionlint-pin.sh:56 の sed パターンは、64桁の digest 直後を
# 「行末」または「空白+YAMLコメント」に限定している。65桁目以降に余分な文字列が
# 続く不正な digest は entry_version の抽出に失敗し、フォーマットエラーとして
# 検知されるべき（この制約が緩むと、不正な digest でもチェックを通過してしまう）。
loose_digest_config="$WORKDIR/loose-digest.yaml"
write_config "$loose_digest_config" "$(
  cat <<EOF
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.12
    hooks:
      - id: actionlint-docker
        entry: docker.io/rhysd/actionlint:1.7.12@sha256:${DIGEST}deadbeef
EOF
)"
assert_case "digest形式の緩さ検知" "$loose_digest_config" 1 "actionlint-docker の entry を読み取れませんでした"

echo ""
echo "── 6. digest 直後の YAML コメントは許可される ──"
commented_digest_config="$WORKDIR/commented-digest.yaml"
write_config "$commented_digest_config" "$(
  cat <<EOF
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.12
    hooks:
      - id: actionlint-docker
        entry: docker.io/rhysd/actionlint:1.7.12@sha256:${DIGEST} # v1.7.12
EOF
)"
assert_case "digest直後のコメント許容" "$commented_digest_config" 0 "✅ actionlint のバージョン固定は整合しています (v1.7.12)"

echo ""
if [ "$exit_code" -eq 0 ]; then
  echo "✅ すべての回帰テストが成功しました"
else
  echo "❌ 回帰テストに失敗しました" >&2
fi

exit "$exit_code"
