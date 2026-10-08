import sys
import json
import argparse
from ddgs import DDGS


def fetch_results(query):
    """DuckDuckGo で検索し、タイトル・URL・本文を持つ辞書のリストを返す。

    Args:
        query: 検索クエリ。

    Returns:
        最大 3 件の検索結果。各要素は title / href / body を持つ。
    """
    results = DDGS().text(query, max_results=3)
    return [
        {
            "title": r.get("title", ""),
            "href": r.get("href", ""),
            "body": r.get("body", ""),
        }
        for r in results
    ]


def main():
    """検索結果を <ddgs-results> タグで囲んだ JSON として標準出力へ書き出す。

    ddgs はスクレイピング系でレート制限や空応答が起きやすい。補助機能の失敗で
    PR のチェックを赤くしないため、検索に失敗した場合はエラーを標準エラーへ
    出力したうえで空の結果を出力し、終了コード 0 で終了する。
    後続の投稿ジョブは結果が 0 件ならコメントを投稿しない。
    """
    parser = argparse.ArgumentParser(description="Fetch AI context using DuckDuckGo search.")
    parser.add_argument("--query", required=True, help="Search query")
    args = parser.parse_args()

    try:
        formatted_results = fetch_results(args.query)
    except Exception as e:
        print(f"<ddgs-error>{str(e)}</ddgs-error>", file=sys.stderr)
        formatted_results = []

    print("<ddgs-results>")
    print(json.dumps(formatted_results, ensure_ascii=False, indent=2))
    print("</ddgs-results>")


if __name__ == "__main__":
    main()
