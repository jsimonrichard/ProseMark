/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { softIndentPrefixBounds } from '../lib/softIndentExtension.ts';

describe('softIndentPrefixBounds', () => {
  test('places bodyStartPos after the prefix and prefixEndPos on its last character', () => {
    const lineFrom = 100;
    const prefix = '- ';
    const bounds = softIndentPrefixBounds(lineFrom, prefix);

    expect(bounds).toEqual({
      lineFrom,
      prefix,
      prefixEndPos: lineFrom + prefix.length - 1,
      bodyStartPos: lineFrom + prefix.length,
    });
  });

  test('keeps prefixEndPos at line start when prefix is empty', () => {
    const bounds = softIndentPrefixBounds(50, '');
    expect(bounds.prefixEndPos).toBe(50);
    expect(bounds.bodyStartPos).toBe(50);
  });
});
