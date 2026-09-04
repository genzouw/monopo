from ddgs import DDGS

try:
    with DDGS() as ddgs:
        for r in ddgs.text('Web development trends React Vite Bun', max_results=2):
            print(f"{r['title']}")
except Exception as e:
    print(f"Error: {e}")
