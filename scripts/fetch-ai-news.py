import sys
import datetime
from ddgs import DDGS

def fetch_news(query):
    results = DDGS().text(query, max_results=5, backend='lite')
    return [
        {
            "title": r.get("title", ""),
            "url": r.get("href", ""),
            "body": r.get("body", "")
        }
        for r in results
    ]

def main():
    query = "Generative AI CI/CD Open Source 2024"
    try:
        results = fetch_news(query)
    except Exception as e:
        print(f"Error fetching news: {e}", file=sys.stderr)
        sys.exit(1)

    if not results:
        print("No news found.")
        sys.exit(0)

    print("## 🤖 本日のAI・CI/CD 最新ニュース速報\n")
    print(f"**取得日**: {datetime.datetime.now().strftime('%Y-%m-%d')}\n")
    print("最新の生成AI、LLM、および自動化に関するニュースをお届けします。開発の自動化やツール導入の参考にしてください。\n")

    for r in results:
        print(f"### [{r['title']}]({r['url']})")
        print(f"- **概要**: {r['body']}\n")

if __name__ == "__main__":
    main()
