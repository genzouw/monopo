import sys
from ddgs import DDGS
import datetime

def fetch_news():
    """DuckDuckGo のニュース検索から最新ニュースを取得する。

    Returns:
        ニュース記事の辞書のリスト。検索に失敗した場合は例外をそのまま送出する。
    """
    query = "generative AI CI CD open source tools GitHub Actions"
    results = DDGS().news(query, max_results=10)
    return list(results)

def main():
    """ニュースを取得して Markdown 形式のレポートを標準出力へ書き出す。

    検索に失敗した場合、またはニュースが 0 件の場合は、Issue を作らないよう
    標準エラーへ理由を出力して非 0 で終了する。
    """
    try:
        news_items = fetch_news()
    except Exception as e:
        print(f"Error fetching news: {e}", file=sys.stderr)
        sys.exit(1)
    if not news_items:
        print("ニュースが見つかりませんでした。", file=sys.stderr)
        sys.exit(1)

    print(f"# 🤖 ウィークリー AI & CI/CD トレンドレポート ({datetime.date.today()})\n")
    print("これは、生成AI、CI/CD、オープンソースに関する最新ニュースを取得する自動化されたウィークリーレポートです。\n")

    for item in news_items:
        title = item.get("title", "No Title")
        url = item.get("url", "#")
        source = item.get("source", "Unknown Source")
        date = item.get("date", "")
        print(f"## [{title}]({url})")
        print(f"**ソース:** {source} | **日付:** {date}\n")
        body = item.get("body", "")
        if body:
            print(f"> {body}\n")

if __name__ == "__main__":
    main()
