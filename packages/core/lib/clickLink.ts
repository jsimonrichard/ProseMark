import { EditorView } from 'codemirror';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { eventHandlersWithClass, iterChildren } from './utils';
import { markdownTags } from './markdown/tags';
import { Facet } from '@codemirror/state';

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

function getLinkRange(
  view: EditorView,
  pos: number,
): { from: number; to: number } | undefined {
  const tree = syntaxTree(view.state);

  let range: { from: number; to: number } | undefined;

  tree.iterate({
    to: pos,
    from: pos,
    enter(node) {
      if (node.name !== 'Link') return;

      range = { from: node.from, to: node.to };
      return true;
    },
  });

  return range;
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

function getLineEndingLinkRangeFromHiddenUrlHit(
  view: EditorView,
  pos: number,
): { from: number; to: number } | undefined {
  const tree = syntaxTree(view.state);

  let range: { from: number; to: number } | undefined;
  tree.iterate({
    from: pos,
    to: pos,
    enter(node) {
      if (node.name !== 'URL') return;
      if (node.node.parent?.name !== 'Link') return;
      range = {
        from: node.node.parent.from,
        to: node.node.parent.to,
      };
      return true;
    },
  });

  if (!range) return undefined;
  if (view.state.doc.lineAt(range.to).to !== range.to) return undefined;
  return range;
}

function hasRenderedLinkForRange(
  view: EditorView,
  range: { from: number; to: number },
): boolean {
  const renderedLinks = view.dom.querySelectorAll<HTMLElement>('.cm-rendered-link');
  for (const renderedLink of renderedLinks) {
    const pos = view.posAtDOM(renderedLink, 0);
    const linkRange = getLinkRange(view, pos);
    if (!linkRange) continue;
    if (linkRange.from === range.from && linkRange.to === range.to) {
      return true;
    }
  }
  return false;
}

/**
 * Fixes a folded-link edge case where clicking right of a line-ending link
 * can place the cursor inside hidden URL syntax.
 */
const cursorAtEndOfLineEndingFoldedLinkExtension = EditorView.domEventHandlers({
  mousedown: (e: MouseEvent, view: EditorView) => {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;

    const pos = view.posAtCoords(e);
    if (pos === null) return false;

    const linkRange = getLineEndingLinkRangeFromHiddenUrlHit(view, pos);
    if (!linkRange) return false;
    if (!hasRenderedLinkForRange(view, linkRange)) return false;

    view.dispatch({ selection: { anchor: linkRange.to } });
    return true;
  },
});

export const clickLinkExtension = [
  cursorAtEndOfLineEndingFoldedLinkExtension,
  clickFullLinkExtension,
  addClassToUrl,
  clickRawUrlExtension,
];
