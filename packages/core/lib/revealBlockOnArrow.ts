import { type DecorationSet, EditorView, keymap } from '@codemirror/view';
import { foldExtension } from './fold';
import { hideExtension } from './hide';
import { EditorSelection, type StateField } from '@codemirror/state';
import { decorationHasReplaceWidget } from './utils';

const onlyWhitespaceBetween = (
  view: EditorView,
  from: number,
  to: number,
): boolean => {
  if (from >= to) return false;
  return /^[\t \n\r]+$/.test(view.state.doc.sliceString(from, to));
};

const maybeReveal = (
  decorationField: StateField<DecorationSet>,
  view: EditorView,
  direction: 'up' | 'down',
): boolean => {
  const decorations = view.state.field(decorationField);
  const cursorAt = view.state.selection.main.head;
  const lineAtCursor = view.state.doc.lineAt(cursorAt);
  let nearestRevealUpTo: number | null = null;
  let nearestRevealDownFrom: number | null = null;

  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
    // Only block-replace *widgets* (fold/HTML preview, images, etc.). Plain
    // `Decoration.replace` from hide (no widget) shares the same ranges and
    // would steal ArrowUp from the line after the hidden syntax.
    if (!decorationHasReplaceWidget(iter.value)) continue;
    if (direction === 'down' && cursorAt == iter.from - 1) {
      view.dispatch({
        selection: EditorSelection.single(iter.from),
      });
      return true;
    } else if (direction === 'up' && cursorAt == iter.to + 1) {
      view.dispatch({
        selection: EditorSelection.single(iter.to),
      });
      return true;
    } else if (
      direction === 'up' &&
      iter.to < lineAtCursor.from &&
      onlyWhitespaceBetween(view, iter.to, lineAtCursor.from)
    ) {
      nearestRevealUpTo =
        nearestRevealUpTo == null || iter.to > nearestRevealUpTo
          ? iter.to
          : nearestRevealUpTo;
    } else if (
      direction === 'down' &&
      iter.from > lineAtCursor.to &&
      onlyWhitespaceBetween(view, lineAtCursor.to, iter.from)
    ) {
      nearestRevealDownFrom =
        nearestRevealDownFrom == null || iter.from < nearestRevealDownFrom
          ? iter.from
          : nearestRevealDownFrom;
    }
  }

  if (direction === 'up' && nearestRevealUpTo != null) {
    view.dispatch({
      selection: EditorSelection.single(nearestRevealUpTo),
    });
    return true;
  } else if (direction === 'down' && nearestRevealDownFrom != null) {
    view.dispatch({
      selection: EditorSelection.single(nearestRevealDownFrom),
    });
    return true;
  }

  return false;
};

const revealBlockOnArrowExtension_ = (
  decorationField: StateField<DecorationSet>,
) =>
  keymap.of([
    {
      key: 'ArrowUp',
      run: (view) => maybeReveal(decorationField, view, 'up'),
    },
    {
      key: 'ArrowDown',
      run: (view) => maybeReveal(decorationField, view, 'down'),
    },
  ]);

export const revealBlockOnArrowExtension = [hideExtension, foldExtension].map(
  revealBlockOnArrowExtension_,
);
