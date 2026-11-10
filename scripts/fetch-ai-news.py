import re
import sys
import datetime
from ddgs import DDGS

def clean(text, limit=300):
    """外部サイト由来の文字列を Issue 本文へ安全に埋め込める形へ整える。

    空白を 1 つにまとめ、メンション・Markdown・HTML の制御に使われる記号を除去し、長すぎる場合は切り詰める。
    """
    text = re.sub(r"\s+", " ", text or "").strip()
    text = re.sub(r"[@<>\[\]()`]", "", text)
    return text[:limit]


def clean_url(url):
    """http(s) 以外のスキームや Markdown を崩す文字を含む URL を空文字にする。"""
    url = (url or "").strip()
    if not re.fullmatch(r"https?://[^\s()<>\[\]]+", url):
        return ""
    return url


def fetch_news(query):
    results = DDGS().text(query, max_results=5, backend='lite')
    return [
        {
            "title": clean(r.get("title", ""), 120),
            "url": clean_url(r.get("href", "")),
            "body": clean(r.get("body", ""))
        }
        for r in results
    ]

def main():
    year = datetime.datetime.now().year
    query = f"Generative AI CI/CD Open Source {year}"
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
        if r["url"]:
            print(f"### [{r['title']}]({r['url']})")
        else:
            print(f"### {r['title']}")
        print(f"- **概要**: {r['body']}\n")

if __name__ == "__main__":
    main()
