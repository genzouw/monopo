import sys
import json
import argparse
from ddgs import DDGS

def main():
    parser = argparse.ArgumentParser(description="Fetch AI context using DuckDuckGo search.")
    parser.add_argument("--query", required=True, help="Search query")
    args = parser.parse_args()

    try:
        results = DDGS().text(args.query, max_results=3)
        formatted_results = []
        for r in results:
            formatted_results.append({
                "title": r.get("title", ""),
                "href": r.get("href", ""),
                "body": r.get("body", "")
            })
        print("<ddgs-results>")
        print(json.dumps(formatted_results, ensure_ascii=False, indent=2))
        print("</ddgs-results>")
    except Exception as e:
        print(f"<ddgs-error>{str(e)}</ddgs-error>", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
