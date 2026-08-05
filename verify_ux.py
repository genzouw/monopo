from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = context.new_page()
        page.goto("http://localhost:4173/monopo/")
        page.wait_for_selector("[aria-label='プレイヤーを減らす']")
        page.screenshot(path="/home/jules/verification/screenshots/screenshot.png")
        context.close()
        browser.close()

if __name__ == "__main__":
    run()
