import { EditorView } from 'codemirror';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { eventHandlersWithClass, iterChildren } from './utils';
import { markdownTags } from './markdown/tags';
import { Facet, type EditorState } from '@codemirror/state';

function getUrlFromLink(view: EditorView, pos: number): string | undefined {
  const tree = syntaxTree(view.state);

  let url: string | undefined;

  tree.iterate({
    to: pos,
    from: pos,
    enter(node) {
      if (node.name !== 'Link') return;

      iterChildren(node.node.cursor(), (cursor) => {
        if (cursor.name === 'URL') {
          url = view.state.doc.sliceString(cursor.from, cursor.to);
          return true;
        }
      });
      return true;
    },
  });

  return url;
}

export type ClickLinkHandler = (link: string) => void;

export const clickLinkHandler = Facet.define<ClickLinkHandler>();

export const defaultClickLinkHandler = clickLinkHandler.of((url) => {
  window.open(url, '_blank');
});

const clickFullLinkExtension = EditorView.domEventHandlers(
  eventHandlersWithClass({
    mousedown: {
      'cm-rendered-link': (e: MouseEvent, view: EditorView) => {
        const pos = view.posAtCoords(e);
        if (pos === null) {
          return;
        }

        const url = getUrlFromLink(view, pos);
        if (!url) {
          return;
        }

        view.state.facet(clickLinkHandler).map((handler) => {
          handler(url);
        });
      },
    },
  }),
);

const getRawUrl = (view: EditorView, pos: number): string | undefined => {
  const tree = syntaxTree(view.state);

  let url: string | undefined;

  tree.iterate({
    to: pos,
    from: pos,
    enter(node) {
      if (node.name !== 'URL') return;
      if (node.node.parent?.name === 'Link') return;

      url = view.state.doc.sliceString(node.from, node.to);
      return true;
    },
  });

  return url;
};

const addClassToUrl = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: markdownTags.linkURL,
      class: 'cm-url', // needed for click event
    },
  ]),
);

const clickRawUrlExtension = EditorView.domEventHandlers(
  eventHandlersWithClass({
    mousedown: {
      'cm-url': (e: MouseEvent, view: EditorView) => {
        const pos = view.posAtCoords(e);
        if (pos === null) {
          return;
        }

        const url = getRawUrl(view, pos);
        if (!url) {
          return;
        }

        view.state.facet(clickLinkHandler).map((handler) => {
          handler(url);
        });
      },
    },
  }),
);

const cursorAtEndOfLineEndingFoldedLinkExtension = EditorView.domEventHandlers({
  mousedown: (e: MouseEvent, view: EditorView) => {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;

    const clickPos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (clickPos === null) return false;

    const linkRange = getLineEndingLinkRangeFromHiddenUrlHit(view.state, clickPos);
    if (!linkRange) return false;

    // Only snap when click is at or right of rendered link end.
    const linkEndCoords = view.coordsAtPos(linkRange.to);
    if (linkEndCoords && e.clientX < linkEndCoords.left - 1) return false;

    view.dispatch({ selection: { anchor: linkRange.to } });
    return true;
  },
});

function getLineEndingLinkRangeFromHiddenUrlHit(
  state: EditorState,
  pos: number,
): { from: number; to: number } | undefined {
  const tree = syntaxTree(state);

  let range: { from: number; to: number } | undefined;
  tree.iterate({
    from: pos,
    to: pos,
    enter(node) {
      if (node.name !== 'Link') return;

      let urlFrom: number | undefined;
      iterChildren(node.node.cursor(), (cursor) => {
        if (cursor.name === 'URL') {
          urlFrom = cursor.from;
          return true;
        }
      });
      if (urlFrom === undefined) return;

      // In folded links, clicks just to the right of visible label text often
      // map into the hidden closing mark / URL zone near `](...)`.
      if (pos < urlFrom - 2) return;

      range = { from: node.from, to: node.to };
      return true;
    },
  });

  if (!range) return undefined;
  if (state.doc.lineAt(range.to).to !== range.to) return undefined;
  return range;
}

/**
 * Fixes a folded-link edge case where clicking right of a line-ending link
 * can place the cursor inside hidden URL syntax.
 */
export const clickLinkExtension = [
  cursorAtEndOfLineEndingFoldedLinkExtension,
  clickFullLinkExtension,
  addClassToUrl,
  clickRawUrlExtension,
];
