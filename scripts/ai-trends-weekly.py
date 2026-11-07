import sys
import json
from ddgs import DDGS
import datetime

def fetch_news():
    query = "generative AI CI CD open source tools GitHub Actions"
    try:
        results = DDGS().news(query, max_results=10)
        return list(results)
    except Exception as e:
        print(f"Error fetching news: {e}", file=sys.stderr)
        return []

def main():
    news_items = fetch_news()
    if not news_items:
        print("ニュースが見つかりませんでした。")
        sys.exit(0)

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
