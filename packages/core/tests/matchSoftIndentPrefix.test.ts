/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { matchSoftIndentPrefix } from '../lib/softIndentExtension.ts';

describe('matchSoftIndentPrefix', () => {
  test('matches list and blockquote prefixes', () => {
    expect(matchSoftIndentPrefix('- item')).toBe('- ');
    expect(matchSoftIndentPrefix('  - nested')).toBe('  - ');
    expect(matchSoftIndentPrefix('> quote')).toBe('> ');
    expect(matchSoftIndentPrefix('    indented')).toBe('    ');
    expect(matchSoftIndentPrefix('1. ordered')).toBe('1. ');
    expect(matchSoftIndentPrefix('- [x] task')).toBe('- [x] ');
  });

  test('does not match plain paragraphs (with or without math)', () => {
    expect(matchSoftIndentPrefix('Plain paragraph')).toBeNull();
    expect(matchSoftIndentPrefix('Inline $x^2$ in prose')).toBeNull();
    expect(matchSoftIndentPrefix('$x$ at start')).toBeNull();
  });
});
