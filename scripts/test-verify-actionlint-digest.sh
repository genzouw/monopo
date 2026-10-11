#!/usr/bin/env bash
# scripts/verify-actionlint-digest.sh の回帰テスト。
#
# レジストリへは接続せず、VERIFY_INSPECT_CMD にスタブを差して次を検証する：
#   1. 一致（digest がタグの実体と同じ）
#   2. 不一致（形式は有効だが別の実体を指す digest）→ 終了コード 1
#   3. 到達不能（スタブが失敗し続ける）→ 警告を出して終了コード 0、規定回数だけ再試行する
#   4. 一時的な失敗の後に成功する → 再試行で一致を確認できる
#   5. entry の形式不正（digest 欠落）→ 終了コード 1
#   6. repo ブロック消失 → 終了コード 1
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_SCRIPT="$REPO_ROOT/scripts/verify-actionlint-digest.sh"

if [ ! -x "$TARGET_SCRIPT" ]; then
  echo "❌ $TARGET_SCRIPT が見つからないか実行権限がありません。" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# 公開 Docker イメージの manifest digest（秘密情報ではない）。
DIGEST="b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667" # pragma: allowlist secret
OTHER="0000000000000000000000000000000000000000000000000000000000000001"  # pragma: allowlist secret

write_config() {
  local file="$1"
  local entry="$2"
  cat >"$file" <<YAML
repos:
  - repo: https://github.com/rhysd/actionlint
    rev: v1.7.12
    hooks:
      - id: actionlint-docker
        entry: ${entry}
  - repo: https://github.com/example/other-hook
    rev: v9.9.9
    hooks:
      - id: other-hook
YAML
}

# 常に固定の digest を返すスタブ。
make_stub_ok() {
  local file="$1" digest="$2"
  printf '#!/usr/bin/env bash\necho "sha256:%s"\n' "$digest" >"$file"
  chmod +x "$file"
}

# 常に失敗するスタブ。呼び出し回数を counter ファイルへ 1 行ずつ追記する。
make_stub_fail() {
  local file="$1" counter="$2"
  printf '#!/usr/bin/env bash\necho x >>"%s"\nexit 1\n' "$counter" >"$file"
  chmod +x "$file"
}

# 最初の 1 回だけ失敗し、以降は digest を返すスタブ。
make_stub_flaky() {
  local file="$1" counter="$2" digest="$3"
  cat >"$file" <<STUB
#!/usr/bin/env bash
echo x >>"$counter"
if [ "\$(wc -l <"$counter")" -le 1 ]; then exit 1; fi
echo "sha256:${digest}"
STUB
  chmod +x "$file"
}

exit_code=0

assert_case() {
  local label="$1" config="$2" stub="$3" expected_status="$4" expected_pattern="$5"
  local output status=0
  output="$(VERIFY_INSPECT_CMD="$stub" VERIFY_RETRIES=3 VERIFY_RETRY_SLEEP=0 "$TARGET_SCRIPT" "$config" 2>&1)" || status=$?

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

assert_count() {
  local label="$1" counter="$2" expected="$3" actual=0
  if [ -f "$counter" ]; then
    actual="$(wc -l <"$counter" | tr -d ' ')"
  fi
  if [ "$actual" -ne "$expected" ]; then
    echo "❌ ${label}: 取得の試行回数が期待と異なります（実際: ${actual} / 期待: ${expected}）"
    exit_code=1
    return
  fi
  echo "✅ ${label}: 取得の試行回数 ${actual}"
}

ok_config="$WORKDIR/ok.yaml"
write_config "$ok_config" "docker.io/rhysd/actionlint:1.7.12@sha256:${DIGEST}"

echo "── 1. 一致 ──"
stub_ok="$WORKDIR/stub-ok.sh"
make_stub_ok "$stub_ok" "$DIGEST"
assert_case "一致" "$ok_config" "$stub_ok" 0 "digest はタグの実体と一致しています"

echo ""
echo "── 2. 不一致（形式は有効だが別の実体を指す） ──"
stub_other="$WORKDIR/stub-other.sh"
make_stub_ok "$stub_other" "$OTHER"
assert_case "不一致" "$ok_config" "$stub_other" 1 "タグの実体と一致していません"

echo ""
echo "── 3. 到達不能（警告を出して成功扱い、3 回再試行） ──"
stub_fail="$WORKDIR/stub-fail.sh"
counter_fail="$WORKDIR/counter-fail"
make_stub_fail "$stub_fail" "$counter_fail"
assert_case "到達不能" "$ok_config" "$stub_fail" 0 "::warning"
assert_count "到達不能の再試行" "$counter_fail" 3

echo ""
echo "── 4. 一時的な失敗の後に成功 ──"
stub_flaky="$WORKDIR/stub-flaky.sh"
counter_flaky="$WORKDIR/counter-flaky"
make_stub_flaky "$stub_flaky" "$counter_flaky" "$DIGEST"
assert_case "一時失敗後に一致" "$ok_config" "$stub_flaky" 0 "digest はタグの実体と一致しています"
assert_count "一時失敗の再試行" "$counter_flaky" 2

echo ""
echo "── 5. entry の形式不正（digest 欠落） ──"
bad_config="$WORKDIR/bad.yaml"
write_config "$bad_config" "docker.io/rhysd/actionlint:1.7.12"
assert_case "digest欠落" "$bad_config" "$stub_ok" 1 "actionlint-docker の entry を読み取れませんでした"

echo ""
echo "── 6. repo ブロック消失 ──"
noblock_config="$WORKDIR/noblock.yaml"
printf 'repos:\n  - repo: https://github.com/example/other-hook\n    rev: v9.9.9\n    hooks:\n      - id: other-hook\n' >"$noblock_config"
assert_case "ブロック消失" "$noblock_config" "$stub_ok" 1 "rhysd/actionlint の repo ブロックが見つかりません"

echo ""
if [ "$exit_code" -eq 0 ]; then
  echo "✅ すべての回帰テストが成功しました"
else
  echo "❌ 回帰テストに失敗しました" >&2
fi
exit "$exit_code"
