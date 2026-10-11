#!/usr/bin/env bash
#
# .pre-commit-config.yaml の actionlint-docker の entry に書かれた digest が、
# 同じ entry のタグがレジストリ上で実際に指す manifest digest と一致するかを検証する。
#
# 背景:
#   scripts/check-actionlint-pin.sh は rev と entry の「バージョン文字列」の一致しか
#   見ない（オフラインで完結させるため）。タグだけ新版へ書き換えて digest を据え置く、
#   または別のイメージの digest を書いても、そのチェックは通過してしまう。
#   本スクリプトはレジストリへ問い合わせて digest の実体を確かめる。
#   ネットワーク依存のため、ローカルの pre-commit には組み込まず、
#   .pre-commit-config.yaml を変更する PR の CI（.github/workflows/actionlint-digest.yml）でだけ実行する。
#
# 終了コード:
#   0: 一致した、またはレジストリへ到達できず検証を行えなかった（::warning:: を出力する）
#   1: digest 不一致、設定ファイルの形式不正、docker を実行できない、タグがレジストリに無い
#
# 成功扱いにするのは到達不能（ネットワーク断・rate limit・認証失敗）だけである。
# ネットワーク不調で無関係な PR を止めないためで、警告に最後の stderr 1 行を含め、無言では通さない。
# docker が無い・タグが無い場合は再試行しても直らず、検証が常に空振りになるため失敗にする。
#
# 環境変数（テスト用・調整用）:
#   VERIFY_INSPECT_CMD  タグから manifest digest を取得するコマンド。
#                       引数に <image>:<tag> を受け取り、標準出力へ sha256:... を 1 行返す。
#                       既定は docker buildx imagetools inspect --format '{{.Manifest.Digest}}'
#   VERIFY_RETRIES      取得の試行回数（既定: 3）
#   VERIFY_RETRY_SLEEP  試行間の待機秒数（既定: 5）

set -euo pipefail

CONFIG="${1:-.pre-commit-config.yaml}"
RETRIES="${VERIFY_RETRIES:-3}"
RETRY_SLEEP="${VERIFY_RETRY_SLEEP:-5}"

if [ ! -f "$CONFIG" ]; then
  echo "❌ 設定ファイルが見つかりません: $CONFIG" >&2
  exit 1
fi

# 次の `- repo:` 行が現れた時点でブロック外と判定する（check-actionlint-pin.sh と同じ）。
block="$(
  awk '
    /^[[:space:]]*-[[:space:]]+repo:[[:space:]]/ {
      in_block = ($0 ~ /github\.com\/rhysd\/actionlint[[:space:]]*$/)
    }
    in_block { print }
  ' "$CONFIG"
)"

if [ -z "$block" ]; then
  echo "❌ $CONFIG に rhysd/actionlint の repo ブロックが見つかりません。" >&2
  exit 1
fi

# entry: docker.io/rhysd/actionlint:1.7.12@sha256:<64桁> [# コメント]
entry_line="$(
  printf '%s\n' "$block" |
    sed -n 's|^[[:space:]]*entry:[[:space:]]*\(docker\.io/rhysd/actionlint\):\([0-9][0-9A-Za-z.\-]*\)@\(sha256:[0-9a-f]\{64\}\)\([[:space:]]\{1,\}#.*\)\{0,1\}$|\1 \2 \3|p' |
    head -n 1
)"

if [ -z "$entry_line" ]; then
  echo "❌ actionlint-docker の entry を読み取れませんでした。" >&2
  echo "   想定形式: entry: docker.io/rhysd/actionlint:<version>@sha256:<64桁digest>" >&2
  exit 1
fi

read -r image tag pinned_digest <<<"$entry_line"
ref="${image}:${tag}"

inspect_digest() {
  if [ -n "${VERIFY_INSPECT_CMD:-}" ]; then
    "$VERIFY_INSPECT_CMD" "$1"
  else
    docker buildx imagetools inspect "$1" --format '{{.Manifest.Digest}}'
  fi
}

# 取得の失敗は原因で扱いを分ける。
#   - docker が無い・buildx プラグインが無い（終了コード 127 / command not found /
#     is not a docker command）、タグが無い（manifest unknown など）:
#     設定側かランナー側の問題で、再試行しても直らないため即座に失敗（exit 1）にする。
#   - それ以外（ネットワーク断・rate limit・認証失敗など到達不能）: 再試行し、
#     最後の stderr 1 行を添えた警告つきで成功扱いにする。
actual_digest=""
last_err=""
attempt=1
while [ "$attempt" -le "$RETRIES" ]; do
  status=0
  err_file="$(mktemp)"
  out="$(inspect_digest "$ref" 2>"$err_file")" || status=$?
  last_err="$(grep -v '^[[:space:]]*$' "$err_file" | tail -n 1 || true)"
  rm -f "$err_file"

  if [ "$status" -eq 0 ]; then
    out="$(printf '%s\n' "$out" | head -n 1 | tr -d '[:space:]')"
    if printf '%s' "$out" | grep -qE '^sha256:[0-9a-f]{64}$'; then
      actual_digest="$out"
      break
    fi
    last_err="${last_err:-取得コマンドが digest 形式でない出力を返しました}"
  elif [ "$status" -eq 127 ] || printf '%s' "$last_err" | grep -qiE 'command not found|executable file not found|is not a docker command'; then
    echo "::error title=actionlint digest 検証不可::docker を実行できません: ${last_err:-終了コード ${status}}"
    echo "❌ 取得コマンド（docker buildx）を実行できないため、検証できません。ランナーの構成を確認してください。" >&2
    exit 1
  elif printf '%s' "$last_err" | grep -qiE 'manifest unknown|name unknown|no such manifest|not found'; then
    echo "::error title=actionlint タグ不在::${ref} がレジストリに存在しません: ${last_err}"
    echo "❌ ${ref} がレジストリに見つかりません。entry のタグを確認してください。" >&2
    echo "   詳細: ${last_err}" >&2
    exit 1
  fi

  if [ "$attempt" -lt "$RETRIES" ]; then
    sleep "$RETRY_SLEEP"
  fi
  attempt=$((attempt + 1))
done

if [ -z "$actual_digest" ]; then
  reason="${last_err:-原因不明（stderr なし）}"
  echo "::warning title=actionlint digest 未検証::${ref} の manifest digest をレジストリから取得できませんでした（${RETRIES} 回試行）。digest の実体検証をスキップします。最後のエラー: ${reason}"
  echo "⚠️ ${ref} の digest を取得できず、検証を行えませんでした（成功扱い）。最後のエラー: ${reason}"
  exit 0
fi

if [ "$actual_digest" != "$pinned_digest" ]; then
  cat >&2 <<EOF
❌ actionlint の entry に書かれた digest が、タグの実体と一致していません。

  タグ             : ${ref}
  entry の digest   : ${pinned_digest}
  レジストリの digest: ${actual_digest}

対応手順:
  1. docker buildx imagetools inspect ${ref}
  2. .pre-commit-config.yaml の entry の digest を、取得した値へ更新する
     docker.io/rhysd/actionlint:${tag}@${actual_digest}
EOF
  echo "::error title=actionlint digest 不一致::${ref} の実体は ${actual_digest} ですが、entry は ${pinned_digest} を指しています。"
  exit 1
fi

echo "✅ actionlint の digest はタグの実体と一致しています (${ref}@${actual_digest})"
