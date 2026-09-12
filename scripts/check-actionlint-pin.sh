#!/usr/bin/env bash
#
# .pre-commit-config.yaml の rhysd/actionlint フックについて、
# rev（フック定義のタグ）と entry の Docker イメージタグが
# 同じバージョンを指しているかを検証する。
#
# 背景:
#   entry は digest 固定している（CWE-494: 整合性チェックなしのコード取得対策）が、
#   Dependabot の pre-commit version update は rev 行しか書き換えない。
#   rev だけが上がって entry が古いまま残ると、フック定義と実際に実行される
#   イメージがずれ、「新しい actionlint を入れたつもりで古いイメージが動く」
#   状態になる。このズレを機械的に落とすのが本スクリプトの目的。
#
# 検証の限界:
#   比較するのは rev と entry の「バージョン文字列」までで、digest がそのタグの実体を
#   指しているかは検証しない（ネットワークアクセスを避け、オフラインで完結させるため）。
#   タグだけ新版へ書き換えて digest を据え置くと本チェックは通過するが、docker は
#   タグより digest を優先するため旧イメージが実行される。digest は必ず
#   docker buildx imagetools inspect で取得した値へ差し替えること。
#
#   副次的な効果として、本チェックが落ちること自体が Issue #601
#   （actionlint が self-repository syntax `$/` に対応したら
#   .github/actionlint.yaml を削除する）の着手トリガーになる。
#   上流リリースの検知は Dependabot に委譲しており、rev 更新 PR が届いた時点で
#   このチェックが失敗して作業を促す。

set -euo pipefail

CONFIG="${1:-.pre-commit-config.yaml}"

if [ ! -f "$CONFIG" ]; then
  echo "❌ 設定ファイルが見つかりません: $CONFIG" >&2
  exit 1
fi

# rhysd/actionlint の repo ブロックだけを切り出す。
# 次の `- repo:` 行が現れた時点でブロック外と判定する。
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
  echo "   フックを削除した場合は本チェック（actionlint-pin-consistency）も併せて外してください。" >&2
  exit 1
fi

# rev: v1.7.12 → 1.7.12
rev_version="$(
  printf '%s\n' "$block" |
    sed -n 's/^[[:space:]]*rev:[[:space:]]*v\{0,1\}\([0-9][0-9A-Za-z.\-]*\).*/\1/p' |
    head -n 1
)"

# entry: docker.io/rhysd/actionlint:1.7.12@sha256:... → 1.7.12
entry_version="$(
  printf '%s\n' "$block" |
    sed -n 's|^[[:space:]]*entry:.*rhysd/actionlint:\([0-9][0-9A-Za-z.\-]*\)@sha256:[0-9a-f]\{64\}\([[:space:]]\{1,\}#.*\)\{0,1\}$|\1|p' |
    head -n 1
)"

if [ -z "$rev_version" ]; then
  echo "❌ rhysd/actionlint の rev を読み取れませんでした（想定形式: rev: v1.7.12）。" >&2
  exit 1
fi

if [ -z "$entry_version" ]; then
  echo "❌ actionlint-docker の entry を読み取れませんでした。" >&2
  echo "   想定形式: entry: docker.io/rhysd/actionlint:<version>@sha256:<64桁digest>" >&2
  echo "   digest 固定を外すとサプライチェーン対策が失われるため、形式を維持してください。" >&2
  exit 1
fi

if [ "$rev_version" != "$entry_version" ]; then
  cat >&2 <<EOF
❌ actionlint の rev と Docker イメージのバージョンが一致していません。

  rev  (フック定義): v${rev_version}
  entry (実行イメージ): docker.io/rhysd/actionlint:${entry_version}@sha256:...

Dependabot の pre-commit 更新は rev 行しか書き換えないため、
entry のタグと digest は手で合わせる必要があります。

対応手順:
  1. 対応する digest を取得する
     docker buildx imagetools inspect docker.io/rhysd/actionlint:${rev_version}
  2. .pre-commit-config.yaml の entry を
     docker.io/rhysd/actionlint:${rev_version}@sha256:<取得した digest> に更新する
  3. Issue #601 の完了条件（.github/actionlint.yaml の削除可否）も併せて確認する
     https://github.com/genzouw/monopo/issues/601
EOF
  exit 1
fi

echo "✅ actionlint のバージョン固定は整合しています (v${rev_version})"
