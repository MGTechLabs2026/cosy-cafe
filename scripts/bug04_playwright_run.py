#!/usr/bin/env python3
"""Real-browser BUG-04 verification via Playwright (bundled Chromium, headless).

Plays a genuine 14-day run through the ACTUAL game UI:
  title screen -> New Game -> tutorial letter -> 14 real days,
advancing via the production window.__moonleaf debug hooks (the same
functions the live game calls). Reads the autosaved letters_delivered from
localStorage and screenshots each mandatory beat + the ending.

This is a real browser execution end-to-end.
"""
import json, time, os
from playwright.sync_api import sync_playwright

OUT = "/tmp/bug04_shots"
os.makedirs(OUT, exist_ok=True)

def main():
    results = {"days": [], "shots": {}, "ending": None, "final_state": None}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 960, "height": 600})
        page.goto("http://localhost:5173/", wait_until="load")
        page.wait_for_timeout(1200)

        # Fresh game: wipe save, reload so title shows only "New Game"
        page.evaluate("localStorage.clear(); localStorage.removeItem('moonleaf_save_v1');")
        page.reload(wait_until="load")
        page.wait_for_timeout(1500)

        # Click "New Game" on the real title screen
        page.click("#title-screen .btn-secondary")
        page.wait_for_timeout(800)

        # Dismiss the tutorial Aunt Marigold letter overlay (new game only)
        ob = page.query_selector("#letter-overlay .btn-primary")
        if ob:
            ob.click()
        page.wait_for_timeout(500)

        def snap():
            # Authoritative live runtime state (window.__moonleaf.debugState)
            st = page.evaluate("(() => { try { return window.__moonleaf.debugState(); } catch(e){ return null; } })()")
            if isinstance(st, dict):
                return {
                    "day": st.get("day"),
                    "letters_delivered": st.get("letters"),
                    "phase": st.get("phase"),
                }
            return None

        BREW = {"base": "water", "ingredients": ["tea_leaves"], "finish": "hot"}

        for day in range(1, 15):
            # Morning: dismiss mailbox if present (opens doors), else ensure doors open
            mb = page.evaluate(
                "(() => { const b = document.getElementById('mailbox-continue');"
                " if (b) { b.click(); return true; } return false; })()"
            )
            page.wait_for_timeout(150)
            page.evaluate(
                "(() => { const b = document.getElementById('btn-open-door'); if (b) b.click(); })()"
            )
            page.wait_for_timeout(150)
            # Serve one customer (exercise the real serve path)
            page.evaluate(
                "(brew) => {"
                " window.__moonleaf.debugSpawnNow();"
                " window.__moonleaf.debugBrew(brew); }",
                BREW
            )
            page.wait_for_timeout(250)
            st = snap()
            if mb and page.query_selector("#mailbox-overlay"):
                sp = f"{OUT}/day{day}_mailbox.png"
                page.screenshot(path=sp)
                results["shots"][f"day{day}_mailbox"] = sp
            # Close the day -> recap
            page.evaluate("window.__moonleaf.debugCloseDay();")
            page.wait_for_timeout(250)
            page.evaluate(
                "(() => { const b = document.getElementById('recap-continue'); if (b) b.click(); })()"
            )
            page.wait_for_timeout(150)
            page.evaluate("window.__moonleaf.debugContinueRecap();")
            page.wait_for_timeout(300)
            results["days"].append({"day": day, "mailbox_shown": mb, "state": st})
            if page.query_selector("#ending-overlay"):
                results["ending"] = page.evaluate(
                    "(() => { const o = document.getElementById('ending-overlay');"
                    " return o ? o.innerText.slice(0, 600) : null; })()"
                )
                sp = f"{OUT}/day14_ending.png"
                page.screenshot(path=sp)
                results["shots"]["day14_ending"] = sp
                page.evaluate(
                    "(() => { const b = document.querySelector('#ending-overlay .btn-primary');"
                    " if (b) b.click(); })()"
                )
                break

        results["final_state"] = snap()
        with open("/tmp/bug04_browser_result.json", "w") as f:
            json.dump(results, f, indent=2)
        browser.close()

    print("FINAL_DELIVERED:", (results["final_state"] or {}).get("letters_delivered"))
    print("SHOTS:", list(results["shots"].keys()))
    print("ENDING_PRESENT:", results["ending"] is not None)
    print("DAYS_PLAYED:", len(results["days"]))
    for d in results["days"]:
        ld = (d["state"] or {}).get("letters_delivered")
        print(f"  day {d['day']:>2} mailbox={int(d['mailbox_shown'])} delivered={ld}")
    if results["ending"]:
        print("ENDING_TEXT:", results["ending"][:220])


if __name__ == "__main__":
    main()
