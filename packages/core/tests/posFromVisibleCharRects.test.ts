/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  posFromVisibleCharRects,
  type VisibleCharRect,
} from '../lib/hide/core.ts';

/** Visible label "Code" then a gap where hidden `](url)` would collapse. */
const labelRects: VisibleCharRect[] = [
  { from: 10, to: 11, left: 100, right: 110, top: 20, bottom: 36 }, // C
  { from: 11, to: 12, left: 110, right: 120, top: 20, bottom: 36 }, // o
  { from: 12, to: 13, left: 120, right: 130, top: 20, bottom: 36 }, // d
  { from: 13, to: 14, left: 130, right: 140, top: 20, bottom: 36 }, // e
];

describe('posFromVisibleCharRects', () => {
  test('empty candidates → null', () => {
    expect(posFromVisibleCharRects({ x: 115, y: 28 }, [])).toBeNull();
  });

  test('click in first half of a char → position before that char', () => {
    // Mid of "o" is 115; left of mid → from
    expect(posFromVisibleCharRects({ x: 112, y: 28 }, labelRects)).toBe(11);
  });

  test('click in second half of a char → position after that char', () => {
    expect(posFromVisibleCharRects({ x: 118, y: 28 }, labelRects)).toBe(12);
  });

  test('click on mid-label maps to that visible cluster, not a shared fold x', () => {
    // Just past mid of "d" (120–130) → after → 13
    expect(posFromVisibleCharRects({ x: 126, y: 28 }, labelRects)).toBe(13);
  });

  test('click past last visible char snaps to end of last cluster', () => {
    // Right of "e"; closer to "e" than to anything else
    expect(posFromVisibleCharRects({ x: 200, y: 28 }, labelRects)).toBe(14);
  });

  test('click before first visible char snaps to start of first cluster', () => {
    expect(posFromVisibleCharRects({ x: 50, y: 28 }, labelRects)).toBe(10);
  });

  test('width-0 fold join is not needed: only positive-width rects compete', () => {
    // Simulate what CM would see: many zero-width hidden offsets at x=140
    // are simply omitted from the candidate list.
    const onlyVisible = labelRects;
    expect(posFromVisibleCharRects({ x: 140, y: 28 }, onlyVisible)).toBe(14);
  });

  test('y outside line retries against nearest vertical neighbor', () => {
    const twoLines: VisibleCharRect[] = [
      { from: 0, to: 1, left: 100, right: 110, top: 0, bottom: 16 },
      { from: 10, to: 11, left: 100, right: 110, top: 20, bottom: 36 },
    ];
    // y=18 is equidistant; CM prefers below when not strictly closer to above
    expect(posFromVisibleCharRects({ x: 106, y: 18 }, twoLines)).toBe(11);
  });

  test('RTL midpoint assoc flips', () => {
    const rtl = [
      { from: 0, to: 1, left: 100, right: 120, top: 20, bottom: 36 },
    ];
    // LTR: x past mid → after (to)
    expect(posFromVisibleCharRects({ x: 115, y: 28 }, rtl, true)).toBe(1);
    // RTL: x past mid → before (from)
    expect(posFromVisibleCharRects({ x: 115, y: 28 }, rtl, false)).toBe(0);
  });
});
