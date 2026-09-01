// ui/shop.ts — evening-market shop (doc 05 §3.3: shop button inside recap).
// Two sections: the six upgrades (doc 02 §4.2) and today's buyable ingredients
// (§2.5). Insufficient funds = muted price + wiggle-on-click + inline note
// "Earn ¤N more" — NEVER a blocking dialog (doc 05 §5). Owned upgrades show as
// owned. Every purchase routes through sim/upgrades.ts + sim/shelf.ts so state
// changes are atomic and testable.

import { STRINGS, format } from '../data/strings.js';
import { UPGRADES, isUpgradeAvailable, ownedCount, purchaseUpgrade } from '../sim/upgrades.js';
import type { UpgradeId } from '../sim/upgrades.js';
import {
  SELA_CART_FROM_DAY,
  checkRestockAllowed,
  selaCartOpen,
  shelfIdsFor,
  shelfPrice,
} from '../sim/shelf.js';
import type { IngredientId, Inventory } from '../sim/day.js';
import { playOverlayEnter } from './overlay-anim.js';
import { assetUrl } from '../render/images.js';

export interface ShopHooks {
  getCoins: () => number;
  /** Current owned-upgrade ids (save.upgrades). */
  getOwnedUpgrades: () => readonly string[];
  /** Current inventory (kind counts). */
  getInventory: () => Inventory;
  /** Shelf capacity in distinct kinds (upgrade-aware). */
  getShelfCapacity: () => number;
  onBuyUpgrade: (id: UpgradeId) => void;
  onBuyIngredient: (id: IngredientId) => void;
  onClose: () => void;
}

let hooksRef: ShopHooks | null = null;

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById('shop-overlay');
  if (existing) return existing as HTMLDivElement;

  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const overlay = document.createElement('div');
  overlay.id = 'shop-overlay';
  overlay.className = 'overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.shop.title);

  const panel = document.createElement('div');
  panel.className = 'panel shop-panel';

  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'panel-close';
  closeX.setAttribute('aria-label', STRINGS.settings.close);
  closeX.textContent = '×';
  closeX.addEventListener('click', () => hooksRef?.onClose());

  const header = document.createElement('div');
  header.className = 'shop-header';

  const title = document.createElement('h2');
  title.textContent = STRINGS.shop.title;

  // Sela's cart art, next to the title so it's visible the instant the shop
  // opens (previously it sat mid-scroll above her ingredient rows). Created
  // once and toggled per render() — visible only once her cart is open.
  const cartArt = document.createElement('img');
  cartArt.className = 'shop-cart-art';
  cartArt.src = assetUrl('assets/props/sela_cart.png');
  cartArt.alt = '';
  cartArt.hidden = true;

  header.appendChild(title);
  header.appendChild(cartArt);

  // Running purse total — updated in place on every buy (below), never a
  // full re-render, so it can pulse when it drops.
  const coins = document.createElement('p');
  coins.className = 'shop-coins';
  coins.setAttribute('aria-live', 'polite');

  panel.appendChild(closeX);
  panel.appendChild(header);
  panel.appendChild(coins);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) hooksRef?.onClose();
  });

  return overlay;
}

/**
 * Repaint the purse total from the live coin count. Called on open and after
 * every successful buy; pulses when the number goes down so a purchase reads.
 */
function refreshCoins(): void {
  if (!hooksRef) return;
  const el = document.querySelector<HTMLElement>('#shop-overlay .shop-coins');
  if (!el) return;
  const coins = hooksRef.getCoins();
  const prev = el.dataset['coins'] !== undefined ? Number(el.dataset['coins']) : coins;
  el.dataset['coins'] = String(coins);
  el.textContent = format(STRINGS.shop.coinsLabel, { amount: coins });
  if (coins < prev) {
    el.classList.remove('shop-coins-spent');
    void el.offsetWidth; // restart the animation on rapid buys
    el.classList.add('shop-coins-spent');
  }
}

/** Wiggle feedback for a rejected purchase (doc 05 §5). */
function wiggle(el: HTMLElement): void {
  el.classList.remove('wiggle');
  // Force reflow so the animation restarts on rapid re-clicks.
  void el.offsetWidth;
  el.classList.add('wiggle');
}

export function openShop(hooks: ShopHooks): void {
  hooksRef = hooks;
  const overlay = ensureOverlay();
  render(overlay);
  overlay.classList.remove('hidden');
  playOverlayEnter(overlay);
}

export function closeShop(): void {
  document.getElementById('shop-overlay')?.classList.add('hidden');
}

export function isShopOpen(): boolean {
  const el = document.getElementById('shop-overlay');
  return !!el && !el.classList.contains('hidden');
}

function render(overlay: HTMLElement): void {
  if (!hooksRef) return;
  const panel = overlay.querySelector<HTMLElement>('.shop-panel');
  if (!panel) return;

  // Rebuild everything below the header. openShop() calls render() on EVERY
  // open, so if we leave stale nodes behind the previous day's rows stack
  // above the new day's rows (the shop then shows day-1 state on day 2).
  // The panel's first THREE children are persistent — close button, header
  // (title + Sela's cart art), and the purse total — drop everything after
  // them and rebuild fresh from the current hooks.
  while (panel.children.length > 3) panel.removeChild(panel.lastChild as Node);

  delete (panel.children[2] as HTMLElement).dataset['coins']; // fresh baseline, no pulse on open
  refreshCoins();

  // Cart art lives in the persistent header, next to the title — toggle it
  // rather than re-inserting it mid-list, so it's visible without scrolling.
  const cartArt = overlay.querySelector<HTMLImageElement>('.shop-cart-art');
  if (cartArt) cartArt.hidden = !selaCartOpen(currentDay());

  // Ingredients first (up) — the everyday restock the player reaches for.
  const ingHeading = document.createElement('h3');
  ingHeading.className = 'shop-section-heading';
  ingHeading.textContent = STRINGS.shop.ingredientsHeading;
  panel.appendChild(ingHeading);

  const notes = document.createElement('p');
  notes.className = 'note shop-note';
  notes.textContent = `${STRINGS.shop.deliveryNote} ${STRINGS.shop.cartNote}`;
  panel.appendChild(notes);

  for (const id of shelfIdsFor('delivery')) {
    panel.appendChild(ingredientRow(id));
  }
  if (selaCartOpen(currentDay())) {
    for (const id of shelfIdsFor('sela')) {
      panel.appendChild(ingredientRow(id));
    }
  } else {
    const closed = document.createElement('p');
    closed.className = 'note shop-note';
    closed.textContent = STRINGS.shop.cartClosed;
    panel.appendChild(closed);
  }

  // Upgrades second (down) — the bigger, occasional purchases.
  const upgradesHeading = document.createElement('h3');
  upgradesHeading.className = 'shop-section-heading';
  upgradesHeading.textContent = STRINGS.shop.upgradesHeading;
  panel.appendChild(upgradesHeading);

  const owned = hooksRef.getOwnedUpgrades();
  for (const upgrade of UPGRADES) {
    panel.appendChild(upgradeRow(upgrade.id, owned));
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-secondary shop-close-btn';
  closeBtn.textContent = STRINGS.shop.close;
  closeBtn.addEventListener('click', () => hooksRef?.onClose());
  panel.appendChild(closeBtn);
}

/** Day is injected via hooks closure context (set by controller before open). */
let dayProvider: () => number = () => 1;
export function setShopDayProvider(provider: () => number): void {
  dayProvider = provider;
}
function currentDay(): number {
  return dayProvider();
}

const WIGGLE_CLASS_MS = 350;

function upgradeRow(id: UpgradeId, owned: readonly string[]): HTMLElement {
  if (!hooksRef) throw new Error('shop hooks missing');
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`unknown upgrade ${id}`);

  const row = document.createElement('div');
  row.className = 'shop-row';
  row.setAttribute('data-upgrade-id', id);
  row.setAttribute('data-cost', String(def.cost));

  const textCol = document.createElement('div');
  textCol.className = 'shop-row-text';

  const name = document.createElement('p');
  name.className = 'journal-card-title';
  name.textContent =
    ownedCount(owned, id) > 0 && def.repeatable
      ? `${STRINGS.upgrades.items[id].name} (${STRINGS.shop.countTemplate.replace('{count}', String(ownedCount(owned, id)))})`
      : STRINGS.upgrades.items[id].name;

  const desc = document.createElement('p');
  desc.className = 'note';
  desc.textContent = STRINGS.upgrades.items[id].desc;

  textCol.appendChild(name);
  textCol.appendChild(desc);
  row.appendChild(textCol);

  const price = document.createElement('span');
  price.className = 'shop-price';
  price.textContent = format(STRINGS.shop.priceTemplate, { price: def.cost });
  row.appendChild(price);

  if (!isUpgradeAvailable(owned, id)) {
    price.classList.add('price-muted');
    const ownedBadge = document.createElement('span');
    ownedBadge.className = 'shop-owned-badge';
    ownedBadge.textContent = STRINGS.shop.owned;
    row.appendChild(ownedBadge);
    return row;
  }

  const buyBtn = document.createElement('button');
  buyBtn.type = 'button';
  buyBtn.className = 'btn btn-primary shop-buy';
  buyBtn.textContent = STRINGS.shop.buyButton;

  const note = document.createElement('p');
  note.className = 'note note-warn shop-row-note';
  note.setAttribute('aria-live', 'polite');

  buyBtn.addEventListener('click', () => {
    if (!hooksRef) return;
    const result = purchaseUpgrade(hooksRef.getCoins(), hooksRef.getOwnedUpgrades(), id);
    if (!result.ok) {
      // Muted price + wiggle + inline "Earn ¤N more" — never a dialog (doc 05 §5).
      price.classList.add('price-muted');
      wiggle(buyBtn);
      note.textContent =
        result.reason === 'insufficient_funds'
          ? format(STRINGS.shop.insufficientFunds, { deficit: result.deficit })
          : STRINGS.shop.unavailable;
      window.setTimeout(() => wiggle(buyBtn), 0);
      return;
    }
    hooksRef.onBuyUpgrade(id);
    refreshCoins();
  });

  row.appendChild(buyBtn);
  row.appendChild(note);
  return row;
}

function ingredientRow(id: IngredientId): HTMLElement {
  if (!hooksRef) throw new Error('shop hooks missing');
  const priceValue = shelfPrice(id);
  const count = hooksRef.getInventory()[id] ?? 0;

  const row = document.createElement('div');
  row.className = 'shop-row';
  row.setAttribute('data-ingredient-id', id);
  row.setAttribute('data-cost', String(priceValue));

  const textCol = document.createElement('div');
  textCol.className = 'shop-row-text';

  const name = document.createElement('p');
  name.className = 'journal-card-title';
  name.textContent = `${STRINGS.ingredients[id]} × ${count}`;

  textCol.appendChild(name);
  row.appendChild(textCol);

  const price = document.createElement('span');
  price.className = 'shop-price';
  price.textContent = format(STRINGS.shop.priceTemplate, { price: priceValue });
  row.appendChild(price);

  const buyBtn = document.createElement('button');
  buyBtn.type = 'button';
  buyBtn.className = 'btn btn-secondary shop-buy';
  buyBtn.textContent = STRINGS.shop.buyButton;

  const note = document.createElement('p');
  note.className = 'note note-warn shop-row-note';
  note.setAttribute('aria-live', 'polite');

  buyBtn.addEventListener('click', () => {
    if (!hooksRef) return;
    const coins = hooksRef.getCoins();
    if (coins < priceValue) {
      price.classList.add('price-muted');
      wiggle(buyBtn);
      note.textContent = format(STRINGS.shop.insufficientFunds, { deficit: priceValue - coins });
      return;
    }
    const capacityCheck = checkRestockAllowed(hooksRef.getInventory(), id, hooksRef.getShelfCapacity());
    if (!capacityCheck.ok) {
      wiggle(buyBtn);
      note.textContent = format(STRINGS.shop.shelfFull, { capacity: capacityCheck.capacity });
      return;
    }
    hooksRef.onBuyIngredient(id);
    // Instant feedback (doc 05 §4): reflect the new stock immediately —
    // "Tea Leaves × N" must tick up in place, not after reopening the shop.
    const updated = hooksRef.getInventory()[id] ?? 0;
    name.textContent = `${STRINGS.ingredients[id]} × ${updated}`;
    refreshCoins();
  });

  row.appendChild(buyBtn);
  row.appendChild(note);
  return row;
}

export { SELA_CART_FROM_DAY };
