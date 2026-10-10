/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorSelection, EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  computeVerticalRevealTarget,
  defaultFoldableSyntaxExtensions,
  foldExtension,
  prosemarkMarkdownSyntaxExtensions,
  revealBlockOnArrowExtension,
} from '../lib/main.ts';

const doc = `a

---

b
`;

const createState = (head: number) =>
  EditorState.create({
    doc,
    selection: EditorSelection.single(head),
    extensions: [
      markdown({
        extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
      }),
      defaultFoldableSyntaxExtensions,
      revealBlockOnArrowExtension,
    ],
  });

const horizontalRuleRange = (state: EditorState) => {
  const decorations = state.field(foldExtension);
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (iter.value.spec.widget) {
      return { from: iter.from, to: iter.to };
    }
  }
  throw new Error('Expected a folded horizontal rule widget');
};

describe('reveal folded blocks on vertical moves', () => {
  test('computeVerticalRevealTarget enters the rule from the line below', () => {
    const bLine = doc.indexOf('b');
    const state = createState(bLine);
    const hr = horizontalRuleRange(state);

    expect(computeVerticalRevealTarget(state, 'up')).toBe(hr.to);
  });

  test('single-line selection moves rewrite like ArrowUp (vim k)', () => {
    const bLine = doc.indexOf('b');
    const state = createState(bLine);
    const hr = horizontalRuleRange(state);
    const blankAboveB = state.doc.line(state.doc.lineAt(bLine).number - 1).from;

    const next = state.update({
      selection: EditorSelection.single(blankAboveB),
    });

    expect(next.state.selection.main.head).toBe(hr.to);
  });

  test('pointer selection is not rewritten', () => {
    const bLine = doc.indexOf('b');
    const state = createState(bLine);
    const blankAboveB = state.doc.line(state.doc.lineAt(bLine).number - 1).from;

    const next = state.update({
      selection: EditorSelection.single(blankAboveB),
      userEvent: 'select.pointer',
    });

    expect(next.state.selection.main.head).toBe(blankAboveB);
  });

  test('extending selection keeps the anchor when revealing', () => {
    const bLine = doc.indexOf('b');
    const state = createState(bLine);
    const hr = horizontalRuleRange(state);
    const blankAboveB = state.doc.line(state.doc.lineAt(bLine).number - 1).from;

    const next = state.update({
      selection: EditorSelection.range(bLine, blankAboveB),
    });

    expect(next.state.selection.main.anchor).toBe(bLine);
    expect(next.state.selection.main.head).toBe(hr.to);
    expect(next.state.selection.main.empty).toBe(false);
  });
});
