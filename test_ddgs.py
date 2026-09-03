from ddgs import DDGS
with DDGS() as ddgs:
    results = ddgs.text('Web development trends React Vite Bun 2025', max_results=2)
    for r in results:
        print(f"{r['title']}: {r['body']}")
