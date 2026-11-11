import sys
import json
import argparse
from ddgs import DDGS
from datetime import datetime, timezone

def fetch_news(query):
    # backend="news" provides recent news articles which is better for trends
    results = DDGS().news(query, timelimit="w", max_results=5)
    return [
        {
            "title": r.get("title", ""),
            "href": r.get("url", ""),
            "body": r.get("body", ""),
            "date": r.get("date", "")
        }
        for r in results
    ]

def main():
    parser = argparse.ArgumentParser(description="Fetch AI news using DuckDuckGo search.")
    parser.add_argument("--query", required=True, help="Search query")
    args = parser.parse_args()

    try:
        formatted_results = fetch_news(args.query)
    except Exception as e:
        print(f"<ddgs-error>{str(e)}</ddgs-error>", file=sys.stderr)
        sys.exit(1)

    print("<ddgs-results>")
    print(json.dumps(formatted_results, ensure_ascii=False, indent=2))
    print("</ddgs-results>")

if __name__ == "__main__":
    main()
