/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { EditorSelection, EditorState } from '@codemirror/state';
import { Decoration, WidgetType } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import {
  computeVerticalRevealTarget,
  defaultFoldableSyntaxExtensions,
  foldableSyntaxFacet,
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

/** Stand-in for multi-line HTML/math block widgets (skip-adjacent, enter at boundary). */
class MultiLineBlockWidget extends WidgetType {
  toDOM() {
    return document.createElement('div');
  }
  eq() {
    return true;
  }
}

describe('reveal multi-line block widgets skipped by vertical moves', () => {
  const multiDoc = `before

$$
x
$$

after
`;

  const blockFrom = multiDoc.indexOf('$$');
  const blockTo = multiDoc.lastIndexOf('$$') + 2;

  const multiLineBlockExtension = foldableSyntaxFacet.of({
    // Paint one multi-line replace widget (like HTML/math blocks outside core).
    // keepDecorationOnUnfold: Document always "touches" the selection; real Math /
    // HTMLBlock nodes only touch when the caret is inside them.
    nodePath: (path) => path === 'Document',
    keepDecorationOnUnfold: true,
    buildDecorations: () =>
      Decoration.replace({
        widget: new MultiLineBlockWidget(),
        block: true,
        inclusive: true,
        proseMarkSkipAdjacentArrowReveal: true,
      }).range(blockFrom, blockTo),
  });

  const createMultiState = (head: number) =>
    EditorState.create({
      doc: multiDoc,
      selection: EditorSelection.single(head),
      extensions: [
        markdown({
          extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
        }),
        multiLineBlockExtension,
        revealBlockOnArrowExtension,
      ],
    });

  test('ArrowDown-style skip over a multi-line widget enters it', () => {
    const atBoundary = blockFrom - 1;
    const state = createMultiState(atBoundary);
    expect(computeVerticalRevealTarget(state, 'down')).toBe(blockFrom);

    // Default CM/vim vertical move often lands just after the replaced range.
    const next = state.update({
      selection: EditorSelection.single(blockTo),
    });

    expect(next.state.selection.main.head).toBe(blockFrom);
  });

  test('ArrowUp-style skip over a multi-line widget enters it', () => {
    const atBoundary = blockTo + 1;
    const state = createMultiState(atBoundary);
    expect(computeVerticalRevealTarget(state, 'up')).toBe(blockTo);

    const next = state.update({
      selection: EditorSelection.single(blockFrom),
    });

    expect(next.state.selection.main.head).toBe(blockTo);
  });

  test('long-range jumps past a widget are not rewritten (PageDown)', () => {
    const atBoundary = blockFrom - 1;
    const state = createMultiState(atBoundary);
    const farAway = multiDoc.length - 1;

    const next = state.update({
      selection: EditorSelection.single(farAway),
    });

    expect(next.state.selection.main.head).toBe(farAway);
  });

  test('pointer jump from the reveal boundary to below is not rewritten', () => {
    const atBoundary = blockFrom - 1;
    const state = createMultiState(atBoundary);

    const next = state.update({
      selection: EditorSelection.single(blockTo),
      userEvent: 'select.pointer',
    });

    expect(next.state.selection.main.head).toBe(blockTo);
  });

  test('jump from above the trigger (not on it) to below is not rewritten', () => {
    const farAbove = multiDoc.indexOf('before');
    const state = createMultiState(farAbove);
    expect(computeVerticalRevealTarget(state, 'down')).toBeNull();

    const next = state.update({
      selection: EditorSelection.single(blockTo),
    });

    expect(next.state.selection.main.head).toBe(blockTo);
  });
});
