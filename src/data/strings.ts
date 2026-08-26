// Strings loader — src/data/strings.json is the single source of truth.
// Writers edit the JSON; code reads keys only (doc 05 §7, README decision log).
//
// resolveJsonModule inlines the JSON at build time with literal types; this
// assignment checks those literals against the Strings contract so a missing
// or misspelled key fails the typecheck instead of shipping an empty label.

import stringsJson from './strings.json';
import type { Strings } from './strings.d';

export const STRINGS: Strings = stringsJson;

/** Fill a template like "Day {day}" → "Day 4". Unknown tokens pass through. */
export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
