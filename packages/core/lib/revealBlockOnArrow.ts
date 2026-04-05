import { type DecorationSet, EditorView, keymap } from '@codemirror/view';
import { foldExtension } from './fold';
import { hideExtension } from './hide';
import { EditorSelection, type StateField } from '@codemirror/state';
import { cursorLineDown, cursorLineUp } from '@codemirror/commands';
import { decorationHasReplaceWidget } from './utils';

/**
 * When the caret sits immediately outside a block-replace *widget*, jump
 * inside so the hidden source can be edited. (Hide-only `Decoration.replace`
 * ranges are ignored — they share spans with visible text and would steal
 * arrow keys from neighboring lines.)
 */
const maybeRevealAtWidgetBoundary = (
  decorationField: StateField<DecorationSet>,
  view: EditorView,
  direction: 'up' | 'down',
): boolean => {
  const decorations = view.state.field(decorationField);
  const cursorAt = view.state.selection.main.head;

  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    if (!decorationHasReplaceWidget(iter.value)) continue;
    if (direction === 'down' && cursorAt == iter.from - 1) {
      view.dispatch({
        selection: EditorSelection.single(iter.from),
      });
      return true;
    }
    if (direction === 'up' && cursorAt == iter.to + 1) {
      view.dispatch({
        selection: EditorSelection.single(iter.to),
      });
      return true;
    }
  }

  return false;
};

/**
 * `cursorLineUp` / `cursorLineDown` use vertical motion; a zero-height blank
 * line still counts as a “line”, so ArrowUp from a heading can land on the
 * blank line between headings. Repeat vertical motion until we hit a line
 * that is not whitespace-only (or vertical motion stalls).
 */
const moveVerticallySkipWhitespaceOnlyLines = (
  view: EditorView,
  forward: boolean,
): boolean => {
  const sel = view.state.selection.main;
  if (!sel.empty) {
    return forward ? cursorLineDown(view) : cursorLineUp(view);
  }

  let range = sel;
  const maxSteps = view.state.doc.lines + 2;

  for (let step = 0; step < maxSteps; step++) {
    const moved = view.moveVertically(range, forward);
    if (moved.head === range.head) {
      return forward ? cursorLineDown(view) : cursorLineUp(view);
    }
    range = moved;
    const line = view.state.doc.lineAt(moved.head);
    if (line.text.trim() === '') continue;
    if (moved.eq(sel)) return false;
    view.dispatch({ selection: moved });
    return true;
  }

  return forward ? cursorLineDown(view) : cursorLineUp(view);
};

const arrowUp = (view: EditorView): boolean => {
  if (maybeRevealAtWidgetBoundary(hideExtension, view, 'up')) return true;
  if (maybeRevealAtWidgetBoundary(foldExtension, view, 'up')) return true;
  return moveVerticallySkipWhitespaceOnlyLines(view, false);
};

const arrowDown = (view: EditorView): boolean => {
  if (maybeRevealAtWidgetBoundary(hideExtension, view, 'down')) return true;
  if (maybeRevealAtWidgetBoundary(foldExtension, view, 'down')) return true;
  return moveVerticallySkipWhitespaceOnlyLines(view, true);
};

export const revealBlockOnArrowExtension = [
  keymap.of([
    { key: 'ArrowUp', run: arrowUp },
    { key: 'ArrowDown', run: arrowDown },
  ]),
];
