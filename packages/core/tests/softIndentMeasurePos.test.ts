/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { softIndentMeasurePos } from '../lib/softIndentExtension.ts';

describe('softIndentMeasurePos', () => {
  test('uses the last character of the prefix, not the position after it', () => {
    const lineFrom = 100;
    const nonContent = '- ';
    expect(softIndentMeasurePos(lineFrom, nonContent.length)).toBe(
      lineFrom + nonContent.length - 1,
    );
  });

  test('does not move before line start for an empty prefix', () => {
    expect(softIndentMeasurePos(50, 0)).toBe(50);
  });
});
