import sys
import json
from ddgs import DDGS

def main():
    try:
        results = DDGS().news("generative AI", max_results=5)
        formatted_results = [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "body": r.get("body", ""),
                "source": r.get("source", ""),
            }
            for r in results
        ]
    except Exception as e:
        # 取得失敗を成功扱いにすると、ニュースが届かない状態に気付けないため非ゼロで終了する
        print(f"<ddgs-error>{str(e)}</ddgs-error>", file=sys.stderr)
        sys.exit(1)

    print("<ddgs-results>")
    print(json.dumps(formatted_results, ensure_ascii=False, indent=2))
    print("</ddgs-results>")

if __name__ == "__main__":
    main()
