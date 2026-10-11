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

/** True when the anchor's visible text is the same URL as its href. */
export const isUrlAsLabelAnchor = (node: HTMLElement): boolean => {
  if (node.nodeName !== 'A') return false;
  const href = node.getAttribute('href')?.trim() ?? '';
  if (!href) return false;
  return node.textContent.trim() === href;
};

/**
 * Turndown configured for ProseMark paste. Anchors whose label equals the
 * href become a bare URL instead of `[url](url)`.
 */
export const createPasteTurndownService = (): TurndownService => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
  });

  turndown.addRule('bareUrlLink', {
    filter: (node, options) => {
      return (
        options.linkStyle === 'inlined' &&
        node.nodeName === 'A' &&
        !!node.getAttribute('href') &&
        isUrlAsLabelAnchor(node)
      );
    },
    replacement: (_content, node) => {
      return node.getAttribute('href')?.trim() ?? '';
    },
  });

  return turndown;
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
  const turndown = createPasteTurndownService();

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
