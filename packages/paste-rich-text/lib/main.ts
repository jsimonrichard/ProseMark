import type { Extension } from '@codemirror/state';
import { EditorView, keymap, type Command } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import TurndownService from 'turndown';

const isSelectionInsideFencedCode = (view: EditorView): boolean => {
  const tree = syntaxTree(view.state);
  const docLength = view.state.doc.length;

  const isInsideAtPos = (position: number, side: -1 | 1): boolean => {
    const clampedPos = Math.max(0, Math.min(position, docLength));
    let node: ReturnType<typeof tree.resolveInner> | null = tree.resolveInner(
      clampedPos,
      side,
    );

    while (node) {
      if (node.name === 'FencedCode') {
        return true;
      }
      node = node.parent;
    }

    return false;
  };

  const { from, to } = view.state.selection.main;
  if (from === to) {
    return isInsideAtPos(from, -1) || isInsideAtPos(from, 1);
  }

  return isInsideAtPos(from, 1) || isInsideAtPos(to, -1);
};

export const pastePlainTextExtension = (
  extraCallback?: (
    view: EditorView,
    pastedRangeFrom: number,
    pastedRangeTo: number,
  ) => void,
): Extension => {
  const pastePlainTextHandler: Command = (view: EditorView) => {
    navigator.clipboard
      .readText()
      .then((text) => {
        const from = view.state.selection.main.from;
        const to = view.state.selection.main.to;
        const newPos = from + text.length;

        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: newPos },
          scrollIntoView: true,
        });

        extraCallback?.(view, from, newPos);
      })
      .catch((err: unknown) => {
        console.error('Failed to paste plain text:', err);
      });

    return true;
  };

  return keymap.of([{ key: 'Mod-Shift-v', run: pastePlainTextHandler }]);
};

export const pasteRichTextExtension = (
  extraCallback?: (
    event: ClipboardEvent,
    view: EditorView,
    pastedRangeFrom: number,
    pastedRangeTo: number,
  ) => void,
): Extension => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
  });

  return EditorView.domEventHandlers({
    paste(event, view) {
      const html = event.clipboardData?.getData('text/html');
      if (!html || isSelectionInsideFencedCode(view)) {
        return false;
      }

      event.preventDefault();
      const markdown = turndown.turndown(html);

      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      const newPos = from + markdown.length;

      view.dispatch({
        changes: { from, to, insert: markdown },
        selection: { anchor: newPos },
        scrollIntoView: true,
      });

      extraCallback?.(event, view, from, newPos);

      return true;
    },
  });
};
