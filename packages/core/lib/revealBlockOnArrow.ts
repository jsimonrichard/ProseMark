import {
  EditorSelection,
  EditorState,
  type Transaction,
} from '@codemirror/state';
import { foldExtension } from './fold';
import { decorationHasReplaceWidget } from './utils';

export type VerticalRevealDirection = 'up' | 'down';

/**
 * When the caret sits immediately outside a block-replace *widget*, jump
 * inside so the hidden source can be edited. (Hide-only `Decoration.replace`
 * ranges are ignored — they share spans with visible text and would steal
 * vertical movement from neighboring lines.)
 */
const revealTargetAtWidgetBoundary = (
  state: EditorState,
  direction: VerticalRevealDirection,
): number | null => {
  const decorations = state.field(foldExtension);
  const cursorAt = state.selection.main.head;

  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!decorationHasReplaceWidget(iter.value)) continue;
    if (direction === 'down' && cursorAt == iter.from - 1) {
      return iter.from;
    }
    if (direction === 'up' && cursorAt == iter.to + 1) {
      return iter.to;
    }
  }

  return null;
};

const revealTargetOnAdjacentLine = (
  state: EditorState,
  direction: VerticalRevealDirection,
): number | null => {
  const decorations = state.field(foldExtension);
  const cursorAt = state.selection.main.head;
  const line = state.doc.lineAt(cursorAt);
  const docText = state.doc;
  let candidate: number | null = null;

  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!decorationHasReplaceWidget(iter.value)) continue;
    const spec = iter.value.spec as {
      proseMarkSkipAdjacentArrowReveal?: boolean;
    };
    if (spec.proseMarkSkipAdjacentArrowReveal) continue;

    if (
      direction === 'up' &&
      iter.to < line.from &&
      /^[\t \n\r]+$/.test(docText.sliceString(iter.to, line.from))
    ) {
      candidate =
        candidate == null || iter.to > candidate ? iter.to : candidate;
      continue;
    }

    if (
      direction === 'down' &&
      iter.from > line.to &&
      /^[\t \n\r]+$/.test(docText.sliceString(line.to, iter.from))
    ) {
      candidate =
        candidate == null || iter.from < candidate ? iter.from : candidate;
    }
  }

  return candidate;
};

/** Document position to move to in order to reveal a folded replace-widget, if any. */
export const computeVerticalRevealTarget = (
  state: EditorState,
  direction: VerticalRevealDirection,
): number | null =>
  revealTargetAtWidgetBoundary(state, direction) ??
  revealTargetOnAdjacentLine(state, direction);

/**
 * Single path for ArrowUp/ArrowDown and vim `j`/`k`: when a selection-only
 * move changes the head by exactly one line, land on the fold-reveal target
 * those keys would have used.
 */
const revealOnSingleLineSelectionMove = (tr: Transaction) => {
  if (tr.docChanged || !tr.selection) return tr;
  if (tr.isUserEvent('select.pointer')) return tr;

  const oldHead = tr.startState.selection.main.head;
  const newHead = tr.newSelection.main.head;
  if (oldHead === newHead) return tr;

  const oldLine = tr.startState.doc.lineAt(oldHead).number;
  const newLine = tr.newDoc.lineAt(newHead).number;
  if (Math.abs(newLine - oldLine) !== 1) return tr;

  const direction: VerticalRevealDirection = newLine > oldLine ? 'down' : 'up';
  const target = computeVerticalRevealTarget(tr.startState, direction);
  if (target == null || target === newHead) return tr;

  // Keep anchors / other ranges so Shift+arrow (and multi-cursor) do not collapse.
  const ranges = tr.newSelection.ranges.slice();
  const mainIndex = tr.newSelection.mainIndex;
  const main = ranges[mainIndex];
  if (!main) return tr;
  ranges[mainIndex] = main.empty
    ? EditorSelection.cursor(target)
    : EditorSelection.range(main.anchor, target);

  return {
    selection: EditorSelection.create(ranges, mainIndex),
  };
};

/**
 * Reveal folded replace-widgets on single-line vertical selection moves
 * (arrow keys, vim `j`/`k`, and any other one-line mover).
 */
export const revealBlockOnArrowExtension = [
  EditorState.transactionFilter.of(revealOnSingleLineSelectionMove),
];
