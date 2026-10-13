/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorSelection } from '@codemirror/state';
import { rangeForVisiblePointerDrag } from '../lib/hide/core.ts';

describe('rangeForVisiblePointerDrag', () => {
  test('drag right from a cursor → forward selection', () => {
    const range = rangeForVisiblePointerDrag(
      EditorSelection.cursor(2),
      EditorSelection.cursor(8),
    );
    expect(range.from).toBe(2);
    expect(range.to).toBe(8);
    expect(range.head).toBe(8);
  });

  test('drag left from a cursor → backward selection', () => {
    const range = rangeForVisiblePointerDrag(
      EditorSelection.cursor(8),
      EditorSelection.cursor(2),
    );
    expect(range.from).toBe(2);
    expect(range.to).toBe(8);
    expect(range.head).toBe(2);
  });

  test('drag across double-click word ranges spans both words', () => {
    const range = rangeForVisiblePointerDrag(
      EditorSelection.range(0, 5),
      EditorSelection.range(10, 15),
    );
    expect(range.from).toBe(0);
    expect(range.to).toBe(15);
    expect(range.head).toBe(15);
  });
});
