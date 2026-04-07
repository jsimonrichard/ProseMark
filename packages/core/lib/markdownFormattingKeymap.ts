import { markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import {
  EditorSelection,
  type ChangeSpec,
  type EditorState,
  type Extension,
  type SelectionRange,
} from '@codemirror/state';
import { type Command, type KeyBinding, keymap } from '@codemirror/view';

function isMarkdownContext(state: EditorState, pos: number): boolean {
  return (
    markdownLanguage.isActiveAt(state, pos, -1) ||
    markdownLanguage.isActiveAt(state, pos, 1)
  );
}

function findOutermostCoveringNode(
  state: EditorState,
  from: number,
  to: number,
  predicate: (n: SyntaxNode) => boolean,
): SyntaxNode | null {
  const tree = syntaxTree(state);
  let found: SyntaxNode | null = null;
  for (let pos = from; pos <= to; pos++) {
    let node: SyntaxNode | null = tree.resolveInner(pos, 1);
    while (node) {
      if (node.to < from || node.from > to) break;
      if (predicate(node)) {
        if (!found || node.from < found.from || node.to > found.to) found = node;
      }
      node = node.parent;
    }
  }
  return found;
}

function toggleInlineMarkup(
  state: EditorState,
  range: SelectionRange,
  nodeName: string,
  open: string,
  close: string,
): { range: SelectionRange; changes: ChangeSpec } | null {
  if (!isMarkdownContext(state, range.from)) return null;
  const { from, to } = range;
  const covering = findOutermostCoveringNode(
    state,
    from,
    to,
    (n) => n.name === nodeName,
  );
  if (covering && covering.from <= from && covering.to >= to) {
    const innerFrom = covering.from + open.length;
    const innerTo = covering.to - close.length;
    if (innerFrom > innerTo) return null;
    const innerLen = innerTo - innerFrom;
    return {
      changes: {
        from: covering.from,
        to: covering.to,
        insert: state.sliceDoc(innerFrom, innerTo),
      },
      range: EditorSelection.range(covering.from, covering.from + innerLen),
    };
  }
  const text = state.sliceDoc(from, to);
  const innerLen = text.length;
  return {
    changes: { from, to, insert: open + text + close },
    range: EditorSelection.range(
      from + open.length,
      from + open.length + innerLen,
    ),
  };
}

function makeToggleInlineCommand(
  nodeName: string,
  open: string,
  close: string,
): Command {
  return (view) => {
    const { state } = view;
    const specs: { range: SelectionRange; changes: ChangeSpec }[] = [];
    for (const range of state.selection.ranges) {
      if (!isMarkdownContext(state, range.from)) return false;
      const spec = toggleInlineMarkup(state, range, nodeName, open, close);
      if (!spec) return false;
      specs.push(spec);
    }
    let i = 0;
    view.dispatch({
      ...state.changeByRange(() => specs[i++] as { range: SelectionRange; changes: ChangeSpec }),
      scrollIntoView: true,
      userEvent: 'input',
    });
    return true;
  };
}

const toggleStrongEmphasis = makeToggleInlineCommand('StrongEmphasis', '**', '**');
const toggleEmphasis = makeToggleInlineCommand('Emphasis', '*', '*');
const toggleInlineCode = makeToggleInlineCommand('InlineCode', '`', '`');
const toggleStrikethrough = makeToggleInlineCommand('Strikethrough', '~~', '~~');

const insertLink: Command = (view) => {
  const { state } = view;
  for (const range of state.selection.ranges) {
    if (!isMarkdownContext(state, range.from)) return false;
  }
  view.dispatch({
    ...state.changeByRange((range) => {
      const label = state.sliceDoc(range.from, range.to);
      const insert = range.empty ? `[]()` : `[${label}]()`;
      const head = range.empty
        ? range.from + 1
        : range.from + 1 + label.length + 2;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.cursor(head),
      };
    }),
    scrollIntoView: true,
    userEvent: 'input',
  });
  return true;
};

/**
 * Key bindings for common rich-text shortcuts in Markdown (Mod = Ctrl on
 * Windows/Linux, Cmd on macOS). Placed ahead of CodeMirror defaults so
 * **Mod-i** applies emphasis instead of `selectParentSyntax`.
 */
export const prosemarkMarkdownFormattingKeymap: readonly KeyBinding[] = [
  { key: 'Mod-b', run: toggleStrongEmphasis, preventDefault: true },
  { key: 'Mod-i', run: toggleEmphasis, preventDefault: true },
  { key: 'Mod-`', run: toggleInlineCode, preventDefault: true },
  { key: 'Mod-k', run: insertLink, preventDefault: true },
  { key: 'Mod-Shift-x', run: toggleStrikethrough, preventDefault: true },
];

export function prosemarkMarkdownFormattingKeymapExtension(): Extension {
  return keymap.of([...prosemarkMarkdownFormattingKeymap]);
}
