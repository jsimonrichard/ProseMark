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

function getVisibleInlineRight(element: HTMLElement): number {
  let right = -Infinity;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(current);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        right = Math.max(right, rect.right);
      }
    }
    current = walker.nextNode();
  }

  if (right > -Infinity) return right;
  return element.getBoundingClientRect().right;
}

/**
 * Fixes a folded-link edge case where clicking right of a line-ending link
 * can place the cursor inside hidden URL syntax.
 */
const cursorAtEndOfLineEndingFoldedLinkExtension = EditorView.domEventHandlers({
  mousedown: (e: MouseEvent, view: EditorView) => {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;
    const clickX = e.clientX;

    const renderedLinks = [
      ...view.dom.querySelectorAll<HTMLElement>('.cm-rendered-link'),
    ].flatMap((renderedLink) => {
      const pos = view.posAtDOM(renderedLink, 0);
      const linkRange = getLinkRange(view, pos);
      if (!linkRange) return [];
      if (view.state.doc.lineAt(linkRange.to).to !== linkRange.to) return [];
      const { top, bottom } = renderedLink.getBoundingClientRect();
      const right = getVisibleInlineRight(renderedLink);
      const verticalDistance =
        e.clientY < top ? top - e.clientY : e.clientY > bottom ? e.clientY - bottom : 0;
      return [{ linkRange, right, verticalDistance }];
    });

    if (renderedLinks.length === 0) return false;

    const yTolerance = view.defaultLineHeight * 2;
    const rightSideTolerance = view.defaultCharacterWidth;
    let candidate:
      | {
          linkRange: { from: number; to: number };
          right: number;
          verticalDistance: number;
        }
      | undefined;
    for (const link of renderedLinks) {
      if (clickX <= link.right - rightSideTolerance) continue;
      if (link.verticalDistance > yTolerance) continue;
      if (
        !candidate ||
        link.verticalDistance < candidate.verticalDistance ||
        (link.verticalDistance === candidate.verticalDistance &&
          link.right > candidate.right)
      ) {
        candidate = link;
      }
    }

    if (!candidate) return false;
    if (clickX <= candidate.right - rightSideTolerance) return false;

    view.dispatch({ selection: { anchor: candidate.linkRange.to } });
    return true;
  },
});

export const clickLinkExtension = [
  cursorAtEndOfLineEndingFoldedLinkExtension,
  clickFullLinkExtension,
  addClassToUrl,
  clickRawUrlExtension,
];
