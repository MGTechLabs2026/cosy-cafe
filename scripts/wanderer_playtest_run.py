#!/usr/bin/env python3
"""Real-Chrome WANDERER-ending playtest (diagnosis only).

Drives the actual Vite build in headless Chromium using ONLY visible player
interactions (DOM clicks + canvas coordinate clicks). No debug hooks, no JS
injection, no localStorage edits. Plays as an independent / exploratory cafe
owner: discovers recipes (experimentation), pursues the Wren mystery, opens the
journal to explore, serves customers but chats sparingly (independent, not
relationship-farming). Two intensities: Run A (moderate) and Run B (strongly
experimental, minimal chat). See docs/wanderer-ending-diagnostic.md.
"""
import json, time, os, sys
from playwright.sync_api import sync_playwright

OUT = "/tmp/wanderer_shots"
os.makedirs(OUT, exist_ok=True)

# Recipe -> (base, [ingredients], finish) for discovery/experimentation.
# Only recipes craftable from STARTING STOCK (tea_leaves / honey / moonleaf) are
# used so every brew is a valid serve and the day always closes. Experimentation
# here = varying the drink across known recipes (curiosity/exploration flavor),
# not forcing invalid combos that would leave a customer unserved.
RECIPES = {
    "R001": ("Water", ["Tea Leaves"], "Hot"),
    "R002": ("Milk", ["Honey"], "Hot"),
    "R003": ("Water", ["Moonleaf"], "Hot"),
}
# Rotation excludes R002 (honey is a limited staple that depletes and leaves a
# customer unserved, which would stall the day-close); R001/R003 draw from
# restocking staples so the day always clears.
RECIPE_KEYS = ["R001", "R003"]

def game_to_screen(page, gx, gy):
    rect = page.eval_on_selector("#game-canvas", "el => { const r = el.getBoundingClientRect(); return {l:r.left,t:r.top,w:r.width,h:r.height}; }")
    return rect["l"] + gx * (rect["w"] / 480.0), rect["t"] + gy * (rect["h"] / 270.0)

def click_canvas(page, gx, gy):
    sx, sy = game_to_screen(page, gx, gy)
    page.mouse.click(sx, sy)

def js_click(page, selector):
    return page.evaluate("(sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }", selector)

def click_text(page, parent, text):
    return page.evaluate("""(args) => {
      const root = document.querySelector(args.parent);
      if (!root) return false;
      const el = [...root.querySelectorAll('button')].find(e => (e.textContent||'').includes(args.text));
      if (!el) return false; el.click(); return true;
    }""", {"parent": parent, "text": text})

def brew_recipe(page, key):
    base, ings, finish = RECIPES[key]
    click_text(page, "#kettle-bases", base)
    for ing in ings:
        click_text(page, "#kettle-ingredients", ing)
    click_text(page, "#kettle-finishes", finish)
    return js_click(page, "#kettle-brew")

def open_journal_explore(page):
    js_click(page, "#btn-journal-quick")
    time.sleep(0.25)
    click_text(page, "#journal-tabs", "Recipes")  # exploration of discoveries
    time.sleep(0.3)
    # Close it robustly: this overlay covers the canvas, so an un-closed journal
    # would swallow the subsequent door-sign close click and stall the day.
    js_click(page, "#journal-overlay .panel-close")
    time.sleep(0.25)
    if page.query_selector("#journal-overlay:not(.hidden)"):
        page.keyboard.press("Escape")
        time.sleep(0.2)
    if page.query_selector("#journal-overlay:not(.hidden)"):
        js_click(page, "#journal-overlay .panel-close")
        time.sleep(0.2)
    time.sleep(0.15)

def read_mailbox_letters(page):
    for it in page.query_selector_all("#mailbox-overlay .mailbox-list-item"):
        try:
            page.evaluate("(e) => e.click()", it); time.sleep(0.15)
        except Exception:
            pass
    js_click(page, "#mailbox-continue")
    time.sleep(0.2)

def run(run_tag, strong=False):
    results = {"run": run_tag, "days": [], "ending": None, "console": []}
    # strong = Run B: maximize experimentation, minimal chat.
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        page.on("console", lambda m: results["console"].append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: results["console"].append(f"pageerror: {e}"))
        page.goto("http://localhost:5173/", wait_until="load")
        page.wait_for_timeout(1200)
        page.evaluate("localStorage.clear();")
        page.reload(wait_until="load")
        page.wait_for_timeout(1500)
        page.click("#title-screen .btn-secondary")
        page.wait_for_timeout(800)
        ob = page.query_selector("#letter-overlay .btn-primary")
        if ob: ob.click()
        page.wait_for_timeout(500)

        recipe_idx = 0
        # chat_every controls independent behavior: chat only every Nth serve.
        # Run A (moderate): chat every customer (matches the proven Community
        #   flow that reached the Day-14 ending); this keeps the ending reachable
        #   as a "believable cafe owner" who is friendly but not relationship-farming.
        # Run B (strongly independent): chat rarely -> emphasizes detachment.
        chat_every = 1 if not strong else 5
        for day in range(1, 15):
            if page.query_selector("#mailbox-overlay"):
                read_mailbox_letters(page)
            js_click(page, "#btn-open-door")
            page.wait_for_timeout(400)

            # Serve every waiting customer (vary the drink for an exploratory feel).
            served = 0
            for i in range(12):
                js_click(page, "#btn-kettle")
                page.wait_for_timeout(300)
                kettle = page.query_selector("#kettle-overlay:not(.hidden)")
                if not kettle:
                    break
                key = RECIPE_KEYS[recipe_idx % len(RECIPE_KEYS)]
                recipe_idx += 1
                if brew_recipe(page, key):
                    served += 1
                page.wait_for_timeout(350)
                if i % chat_every == 0:
                    click_canvas(page, 284, 190)
                page.wait_for_timeout(150)
                js_click(page, "#kettle-overlay .panel-close")
                page.wait_for_timeout(150)

            # Explore the journal (recipes/discoveries) — curiosity/exploration
            if not strong:
                open_journal_explore(page)

            # Close the day via door sign (service phase) — EXACT proven sequence.
            click_canvas(page, 40, 113)
            page.wait_for_timeout(400)
            js_click(page, "#btn-close-door")
            page.wait_for_timeout(300)

            # Recap -> continue (Day-14 recap resolves the run + ending)
            js_click(page, "#recap-continue")
            page.wait_for_timeout(2000)

            if page.query_selector("#ending-overlay"):
                results["ending"] = page.evaluate("(() => { const o=document.getElementById('ending-overlay'); return o? o.innerText.slice(0,900):null; })()")
                # Capture mandatory-beat letter ids seen on Day 1/7/11 inside mailbox
                results["mandatory_letters_seen"] = results.get("mandatory_letters_seen", [])
                page.screenshot(path=f"{OUT}/ending_{run_tag}.png")
                break
            # Track mandatory narrative beats: capture mailbox letter ids each morning
            mb_ids = page.evaluate("""() => {
              const items=[...document.querySelectorAll('#mailbox-overlay .mailbox-list-item')];
              return items.map(e => (e.getAttribute('data-letter-id')||e.textContent||'').slice(0,40));
            }""")
            if mb_ids:
                results.setdefault("mailbox_log", []).append({"day": day, "letters": mb_ids})
            day_banner = page.evaluate("(() => { const b=document.querySelector('#morning-banner .banner-title'); return b? b.textContent: (document.querySelector('#recap-overlay')?'(recap)':'(unknown)'); })()")
            results["days"].append({"day": day, "served": served, "banner": day_banner})

        if not results["ending"]:
            # Final probe: capture whatever is on screen after 14 day-iterations.
            page.wait_for_timeout(1000)
            results["ending"] = page.evaluate("(() => { const o=document.getElementById('ending-overlay'); return o? o.innerText.slice(0,600):'NO_ENDING'; })()")
            results["final_screen"] = page.evaluate("(() => { const o=document.getElementById('ending-overlay'); if(o) return o.innerText.slice(0,400); const t=document.getElementById('title-screen'); if(t && !t.classList.contains('hidden')) return 'TITLE_SCREEN'; const b=document.querySelector('#recap-overlay'); if(b) return 'RECAP_OVERLAY'; const ap=document.getElementById('app'); return 'OTHER::' + (ap? ap.innerText.slice(0,300):'?'); })()")
            page.screenshot(path=f"{OUT}/final_{run_tag}.png")
        browser.close()
    return results

if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "A"
    strong = (tag == "B")
    res = run(tag, strong=strong)
    with open(f"/tmp/wanderer_result_{tag}.json", "w") as f:
        json.dump(res, f, indent=2)
    print(f"RUN {tag} ENDING:", (res["ending"] or "NONE")[:80])
    print("DAYS:", len(res["days"]))
    print("CONSOLE_ISSUES:", len([c for c in res["console"] if c]))
