import {
  EditorSelection,
  EditorState,
  type Transaction,
} from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
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

const dispatchReveal = (
  view: EditorView,
  target: number,
  extend: boolean,
): boolean => {
  const main = view.state.selection.main;
  view.dispatch({
    selection: extend
      ? EditorSelection.range(main.anchor, target)
      : EditorSelection.cursor(target),
  });
  return true;
};

/**
 * Arrow keys: only reveal when a target exists at the *current* caret
 * (boundary / adjacent). Consumes the key so default movement never skips the
 * widget — clear “pressed ArrowDown here” intent.
 */
const arrowUp = (view: EditorView): boolean => {
  const target = computeVerticalRevealTarget(view.state, 'up');
  return target == null ? false : dispatchReveal(view, target, false);
};

const arrowDown = (view: EditorView): boolean => {
  const target = computeVerticalRevealTarget(view.state, 'down');
  return target == null ? false : dispatchReveal(view, target, false);
};

const arrowUpSelect = (view: EditorView): boolean => {
  const target = computeVerticalRevealTarget(view.state, 'up');
  return target == null ? false : dispatchReveal(view, target, true);
};

const arrowDownSelect = (view: EditorView): boolean => {
  const target = computeVerticalRevealTarget(view.state, 'down');
  return target == null ? false : dispatchReveal(view, target, true);
};

/**
 * Widget that `target` would open into, if any (down enters at `from`, up at `to`).
 */
const widgetForRevealTarget = (
  state: EditorState,
  direction: VerticalRevealDirection,
  target: number,
): { from: number; to: number } | null => {
  const decorations = state.field(foldExtension);
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!decorationHasReplaceWidget(iter.value)) continue;
    if (direction === 'down' && iter.from === target) {
      return { from: iter.from, to: iter.to };
    }
    if (direction === 'up' && iter.to === target) {
      return { from: iter.from, to: iter.to };
    }
  }
  return null;
};

/**
 * Vim `j`/`k` (and similar) may skip a multi-line block widget in one
 * selection update. Only treat that as “down/up one” when:
 * - the caret *started* on a reveal trigger (`computeVerticalRevealTarget`),
 * - the move is not a pointer selection,
 * - the head landed immediately past that one widget (not PageDown-scale).
 *
 * A click from somewhere above to below does not qualify: no trigger at the
 * start caret, and pointer events are ignored.
 */
const isSingleStepSkipOverRevealWidget = (
  state: EditorState,
  direction: VerticalRevealDirection,
  oldHead: number,
  newHead: number,
  target: number,
): boolean => {
  const widget = widgetForRevealTarget(state, direction, target);
  if (!widget) return false;

  if (direction === 'down') {
    if (!(oldHead < widget.from && newHead >= widget.to)) return false;
    const after = Math.min(widget.to + 1, state.doc.length);
    return newHead <= state.doc.lineAt(after).to;
  }

  if (!(oldHead > widget.to && newHead <= widget.from)) return false;
  const before = Math.max(widget.from - 1, 0);
  return newHead >= state.doc.lineAt(before).from;
};

/**
 * Selection-filter path for movers that are not ArrowUp/Down (notably vim
 * `j`/`k`). Requires a reveal trigger at the start caret — never “any
 * selection above the widget”.
 */
const revealOnVerticalSelectionMove = (tr: Transaction) => {
  if (tr.docChanged || !tr.selection) return tr;
  if (tr.isUserEvent('select.pointer')) return tr;

  const oldHead = tr.startState.selection.main.head;
  const newHead = tr.newSelection.main.head;
  if (oldHead === newHead) return tr;

  const oldLine = tr.startState.doc.lineAt(oldHead).number;
  const newLine = tr.newDoc.lineAt(newHead).number;
  if (oldLine === newLine) return tr;

  const direction: VerticalRevealDirection = newLine > oldLine ? 'down' : 'up';
  // Start caret must already be at a reveal trigger (boundary / adjacent).
  const target = computeVerticalRevealTarget(tr.startState, direction);
  if (target == null || target === newHead) return tr;

  const lineDelta = Math.abs(newLine - oldLine);
  const oneDocumentLine = lineDelta === 1;
  const oneStepOverWidget =
    lineDelta > 1 &&
    isSingleStepSkipOverRevealWidget(
      tr.startState,
      direction,
      oldHead,
      newHead,
      target,
    );
  if (!oneDocumentLine && !oneStepOverWidget) return tr;

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
 * Reveal folded replace-widgets on vertical moves:
 * - ArrowUp/Down (+ Shift) via keymap when the caret is on a reveal trigger
 * - other one-step vertical movers (e.g. vim `j`/`k`) via transaction filter
 */
export const revealBlockOnArrowExtension = [
  keymap.of([
    { key: 'ArrowUp', run: arrowUp, shift: arrowUpSelect },
    { key: 'ArrowDown', run: arrowDown, shift: arrowDownSelect },
  ]),
  EditorState.transactionFilter.of(revealOnVerticalSelectionMove),
];
