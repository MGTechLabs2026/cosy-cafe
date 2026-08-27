// BATCH 1 — nested scene i18n resolution (doc 10 BUG-02).
//
// The translation data in src/data/strings.json is a nested object. Scene
// dialogue/choice keys are dotted paths (e.g. "fenwick.scene1.line1") that
// must be resolved by traversing the object. getString() must also keep
// working for direct keys, missing keys, and malformed paths without throwing.

import { describe, expect, it } from 'vitest';

import { getString } from '../src/ui/scene';

describe('getString() nested scene i18n resolver (BUG-02)', () => {
  it('resolves a direct (single-segment) key', () => {
    // settings.close is a 2-level nested value addressed by its full dotted
    // key here for symmetry, but a direct key is also supported.
    expect(getString('settings.close')).toBe('Close');
  });

  it('resolves a nested scene dialogue key', () => {
    expect(getString('fenwick.scene1.line1')).toContain("Mountain road's closing early this year");
  });

  it('resolves a deeply nested key (3+ levels)', () => {
    // letters.letter_marigold_1.title is three levels deep.
    expect(getString('letters.letter_marigold_1.title')).toBe('From Aunt Marigold');
  });

  it('falls back to the key when the key is missing', () => {
    expect(getString('fenwick.scene9.doesNotExist')).toBe('fenwick.scene9.doesNotExist');
  });

  it('falls back to the key on a malformed / empty path segment', () => {
    expect(getString('fenwick..line1')).toBe('fenwick..line1');
    expect(getString('')).toBe('');
  });

  it('falls back to the key when an intermediate value is not a string', () => {
    // "fenwick" and "fenwick.scene1" exist but are objects, not strings.
    expect(getString('fenwick')).toBe('fenwick');
    expect(getString('fenwick.scene1')).toBe('fenwick.scene1');
  });

  it('resolves an existing scene choice prompt + label', () => {
    expect(getString('fenwick.scene1.choicePrompt')).toBe('What do you say?');
    expect(getString('fenwick.scene1.choice1Label')).toContain('mountain needs its courier');
  });

  it('never throws on arbitrary / garbage input', () => {
    expect(() => getString('a.b.c.d.e.f')).not.toThrow();
    expect(getString('a.b.c.d.e.f')).toBe('a.b.c.d.e.f');
  });
});
