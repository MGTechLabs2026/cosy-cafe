// ui/logger.ts — production-aware logger.
// Routes debug/test hooks and warnings through a single surface so release
// builds can silence or strip them without hunting for console calls.

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (isDev) console.error(...args);
}
