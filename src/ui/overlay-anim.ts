// ui/overlay-anim.ts — cozy overlay enter helper (docs/11 animation audit).
//
// Every modal (kettle, journal, shop, settings, mailbox, letter, scene, recap,
// ending) now settles in with a soft fade + gentle panel scale instead of a
// hard `display:none` cut. This helper toggles the `.overlay-anim` class so the
// CSS @keyframes replay even for overlays whose DOM node is REUSED across opens
// (kettle/journal/shop/settings), where a plain declaration animation would run
// only once. Reduced motion is honored by the global CSS rules at the bottom of
// main.css, which collapse every animation to an instant rest state.

const ANIM_CLASS = 'overlay-anim';

/**
 * Replay the cozy enter animation on an overlay element. Safe to call on every
 * open: it clears the class, forces a reflow so the animation restarts, then
 * re-adds it. No-ops gracefully if the element is missing.
 */
export function playOverlayEnter(overlay: HTMLElement | null): void {
  if (!overlay) return;
  overlay.classList.remove(ANIM_CLASS);
  // Force reflow so the removed-then-added class reliably restarts the keyframes.
  void overlay.offsetWidth;
  overlay.classList.add(ANIM_CLASS);
}
