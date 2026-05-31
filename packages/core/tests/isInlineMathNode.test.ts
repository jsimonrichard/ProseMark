/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { isInlineMathNode } from '../lib/markdown/mathMarkdown.ts';

const stateWith = (doc: string) => EditorState.create({ doc });

describe('isInlineMathNode', () => {
  test('treats tight $...$ as inline', () => {
    const doc = 'x $a^2$ y';
    const state = stateWith(doc);
    expect(isInlineMathNode(state, 2, 7)).toBe(true);
  });

  test('treats padded $ ... $ as display', () => {
    const doc = 'x $ a $ y';
    const state = stateWith(doc);
    expect(isInlineMathNode(state, 2, 7)).toBe(false);
  });

  test('treats $$...$$ as display', () => {
    const doc = '$$x$$';
    const state = stateWith(doc);
    expect(isInlineMathNode(state, 0, 5)).toBe(false);
  });
});
