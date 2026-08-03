from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = context.new_page()

        page.goto("http://localhost:4173/monopo/")
        page.wait_for_load_state("networkidle")

        # Click the feature toggle to test other features if we wanted
        # page.locator("text='🎓 つかえるあそびかた'").click()

        start_btn = page.locator("button:has-text('ゲームスタート！')")
        if start_btn.is_visible():
            start_btn.click()
            page.wait_for_timeout(1000)

        # Hover over roll button when disabled to capture the tooltip
        # Using a more robust locator based on the emoji and text
        roll_btn = page.locator("button:has-text('🎲 さいころをふる！')")
        if roll_btn.is_visible():
            roll_btn.click()
            page.wait_for_timeout(100) # wait briefly for state change

            # Now it should be "ふっています..."
            rolling_btn = page.locator("button:has-text('🎲 ふっています...')")
            if rolling_btn.is_visible():
                rolling_btn.hover()
                page.wait_for_timeout(500) # wait for tooltip potentially
                page.screenshot(path="/home/jules/verification/screenshots/roll_disabled.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    verify()
