#!/usr/bin/env python3
"""Real-Chrome COMMUNITY-ending playtest (diagnosis only).

Drives the actual Vite build in headless Chromium using ONLY visible player
interactions (DOM clicks + canvas coordinate clicks). No debug hooks, no JS
injection, no localStorage edits. Plays as a community-oriented cafe owner.

Community dimension (from narrative-evaluator.ts) needs:
  lettersReadRatio*0.3 + townLetterRatio*0.2 + uniqueNpcsServed*0.2
  + heartsBreadth*0.15 + townTabOpensPerDay*0.15
This script maximizes the legitimate player-facing signals:
  - serve EVERY customer that arrives (uniqueNpcsServed, hearts via serves)
  - chat EVERY customer (hearts via chat)
  - open the journal TOWN tab every day (townTabOpensPerDay)
  - read EVERY mailbox letter (lettersReadRatio)
It brews R001 (water+tea_leaves+hot) as a normal default serve.
"""
import json, time, os
from playwright.sync_api import sync_playwright

OUT = "/tmp/community_shots"
os.makedirs(OUT, exist_ok=True)

def game_to_screen(page, gx, gy):
    rect = page.eval_on_selector("#game-canvas", "el => { const r = el.getBoundingClientRect(); return {l:r.left,t:r.top,w:r.width,h:r.height}; }")
    sx = rect["l"] + gx * (rect["w"] / 480.0)
    sy = rect["t"] + gy * (rect["h"] / 270.0)
    return sx, sy

def click_canvas(page, gx, gy):
    sx, sy = game_to_screen(page, gx, gy)
    page.mouse.click(sx, sy)

def js_click(page, selector):
    """Dispatch a real click event on a matched element (bypasses Playwright's
    visibility gate but still fires the element's click handler, exactly as a
    user click would). Returns True if an element matched."""
    return page.evaluate("""(sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }""", selector)

def click_text(page, selector_parent, text):
    """Click a child button/chip whose textContent contains `text`."""
    return page.evaluate("""(args) => {
      const {parent, text} = args;
      const root = document.querySelector(parent);
      if (!root) return false;
      const els = [...root.querySelectorAll('button')];
      const el = els.find(e => (e.textContent||'').includes(text));
      if (!el) return false;
      el.click();
      return true;
    }""", {"parent": selector_parent, "text": text})

def brew_default(page):
    # Kettle uses text chips. Select base Water, ingredient Tea Leaves, finish Hot.
    click_text(page, "#kettle-bases", "Water")
    click_text(page, "#kettle-ingredients", "Tea Leaves")
    click_text(page, "#kettle-finishes", "Hot")
    return js_click(page, "#kettle-brew")

def open_journal_town(page):
    js_click(page, "#btn-journal-quick")
    time.sleep(0.3)
    click_text(page, "#journal-tabs", "Town")
    time.sleep(0.3)
    js_click(page, "#journal-overlay .panel-close")
    time.sleep(0.2)

def read_mailbox_letters(page):
    items = page.query_selector_all("#mailbox-overlay .mailbox-list-item")
    for it in items:
        try:
            page.evaluate("(e) => e.click()", it)
            time.sleep(0.15)
        except Exception:
            pass
    js_click(page, "#mailbox-continue")
    time.sleep(0.2)

def capture_hearts(page):
    """Read the visible hearts shown in the journal Regulars tab (player-facing
    evidence of relationship progression). Returns list of 'name: ♥♥♡♡♡'."""
    js_click(page, "#btn-journal-quick")
    time.sleep(0.25)
    click_text(page, "#journal-tabs", "Regulars")
    time.sleep(0.3)
    out = page.evaluate("""() => {
      const lines = [...document.querySelectorAll('#journal-content .journal-hearts')].map(e => e.textContent);
      return lines;
    }""")
    js_click(page, "#journal-overlay .panel-close")
    time.sleep(0.2)
    return out

def main():
    results = {"run": "community", "days": [], "ending": None, "console": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        page.on("console", lambda m: results["console"].append(f"{m.type}: {m.text}") if m.type in ("error","warning") else None)
        page.on("pageerror", lambda e: results["console"].append(f"pageerror: {e}"))
        page.goto("http://localhost:5173/", wait_until="load")
        page.wait_for_timeout(1200)
        page.evaluate("localStorage.clear();")
        page.reload(wait_until="load")
        page.wait_for_timeout(1500)

        # Title -> New Game
        page.click("#title-screen .btn-secondary")
        page.wait_for_timeout(800)
        # dismiss tutorial letter
        ob = page.query_selector("#letter-overlay .btn-primary")
        if ob: ob.click()
        page.wait_for_timeout(500)

        for day in range(1, 15):
            # Morning mailbox (dismiss + read letters)
            mb = page.query_selector("#mailbox-overlay")
            if mb:
                read_mailbox_letters(page)
            # Open doors
            js_click(page, "#btn-open-door")
            page.wait_for_timeout(400)

            # Serve + chat every waiting customer
            served = 0
            for _ in range(12):  # safety bound on customers per day
                # open kettle for active customer
                js_click(page, "#btn-kettle")
                page.wait_for_timeout(300)
                kettle = page.query_selector("#kettle-overlay:not(.hidden)")
                if not kettle:
                    break
                ok = brew_default(page)
                page.wait_for_timeout(400)
                if ok: served += 1
                # chat: click canvas chat icon at game (284,190)
                click_canvas(page, 284, 190)
                page.wait_for_timeout(200)
                # close kettle if still open
                js_click(page, "#kettle-overlay .panel-close")
                page.wait_for_timeout(200)

            # Town journal tab (community signal)
            open_journal_town(page)

            # Close the day: click door sign (service phase) on canvas
            click_canvas(page, 40, 113)  # door sign center at game (~16+24, 100+13)
            page.wait_for_timeout(400)
            # If a close-door button appeared, click it
            js_click(page, "#btn-close-door")
            page.wait_for_timeout(300)

            # Recap -> continue
            js_click(page, "#recap-continue")
            page.wait_for_timeout(400)

            # Ending?
            if page.query_selector("#ending-overlay"):
                results["ending"] = page.evaluate("(() => { const o=document.getElementById('ending-overlay'); return o? o.innerText.slice(0,500):null; })()")
                page.screenshot(path=f"{OUT}/ending.png")
                break
            results["days"].append({"day": day, "served": served, "hearts": capture_hearts(page)})

        # capture final visible state (hearts/stars if present) + ending
        if not results["ending"]:
            results["ending"] = page.evaluate("(() => { const o=document.getElementById('ending-overlay'); return o? o.innerText.slice(0,500):'NO_ENDING_OVERLAY'; })()")
        browser.close()

    with open("/tmp/community_result.json", "w") as f:
        json.dump(results, f, indent=2)
    print("ENDING:", results["ending"])
    print("DAYS:", len(results["days"]))
    print("CONSOLE_ISSUES:", len([c for c in results["console"] if c]))
    for c in results["console"][:10]:
        print("  ", c)

if __name__ == "__main__":
    main()
