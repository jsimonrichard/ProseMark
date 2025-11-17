import { type DecorationSet, EditorView, keymap } from '@codemirror/view';
import { foldExtension } from './fold';
import { hideExtension } from './hide';
import { EditorSelection, type StateField } from '@codemirror/state';

const maybeReveal = (
  decorationField: StateField<DecorationSet>,
  view: EditorView,
  direction: 'up' | 'down',
): boolean => {
  const decorations = view.state.field(decorationField);
  const cursorAt = view.state.selection.main.head;

  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  for (let iter = decorations.iter(); iter.value; iter.next()) {
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
    }
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
