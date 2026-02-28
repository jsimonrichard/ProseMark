import { Decoration } from '@codemirror/view';
import {
  type HidableNodeSpec,
  hidableNodeFacet,
  hideInlineDecoration,
} from './core';
import type { InlineContext, MarkdownConfig } from '@lezer/markdown';
import { markdownTags } from '../markdownTags';
import { stateWORDAt } from '../utils';

export { hideExtension } from './core';

const renderedLinkDecoration = Decoration.mark({
  class: 'cm-rendered-link',
});

const defaultHidableSpecs: HidableNodeSpec[] = [
  {
    nodeName: (name) => name.startsWith('ATXHeading'),
    onHide: (_view, node) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const headerMark = node.node.firstChild!;
      return hideInlineDecoration.range(
        headerMark.from,
        Math.min(headerMark.to + 1, node.to),
      );
    },
  },
  {
    nodeName: (name) => name.startsWith('SetextHeading'),
    subNodeNameToHide: 'HeaderMark',
    block: true,
  },
  {
    nodeName: ['StrongEmphasis', 'Emphasis'],
    subNodeNameToHide: 'EmphasisMark',
  },
  {
    nodeName: 'InlineCode',
    subNodeNameToHide: 'CodeMark',
  },
  {
    nodeName: 'Link',
    subNodeNameToHide: ['LinkMark', 'URL'],
    onHide: (_state, node) => {
      return renderedLinkDecoration.range(node.from, node.to);
    },
  },
  {
    nodeName: 'Strikethrough',
    subNodeNameToHide: 'StrikethroughMark',
  },
  {
    nodeName: 'Escape',
    subNodeNameToHide: 'EscapeMark',
    unhideZone: (state, node) => {
      const WORDAt = stateWORDAt(state, node.from);
      if (WORDAt && WORDAt.to > node.from + 1) return WORDAt;
      return state.doc.lineAt(node.from);
    },
  },
  {
    nodeName: 'FencedCode',
    subNodeNameToHide: ['CodeMark', 'CodeInfo'],
    keepSpace: true,
    // Keep code-fence markers hidden when selecting code content itself.
    // Markers are still revealed when the selection/cursor is on opening/closing
    // fence lines so users can edit them.
    unhideOnSelection: false,
    unhideZone: (state, node) => {
      const openingLine = state.doc.lineAt(node.from);
      const closingLine = state.doc.lineAt(Math.max(node.to - 1, node.from));
      if (openingLine.from === closingLine.from) {
        return openingLine;
      }
      return [openingLine, closingLine];
    },
  },
  {
    nodeName: 'Blockquote',
    subNodeNameToHide: 'QuoteMark',
    keepSpace: true,
  },
];

export const defaultHideExtensions = defaultHidableSpecs.map((spec) =>
  hidableNodeFacet.of(spec),
);

export const escapeMarkdownSyntaxExtension: MarkdownConfig = {
  defineNodes: [
    {
      name: 'EscapeMark',
      style: markdownTags.escapeMark,
    },
  ],
  parseInline: [
    {
      name: 'EscapeMark',
      parse: (cx: InlineContext, next: number, pos: number): number => {
        if (next !== 92 /* \ */) return -1;
        return cx.addElement(
          cx.elt('Escape', pos, pos + 2, [cx.elt('EscapeMark', pos, pos + 1)]),
        );
      },
      before: 'Escape',
    },
  ],
};
