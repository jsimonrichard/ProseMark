import { EditorView } from 'codemirror';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { eventHandlersWithClass, iterChildren } from './utils';
import { markdownTags } from './markdown/tags';
import { Facet } from '@codemirror/state';

const appendDebugLog = (payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}): void => {
  const req = (
    globalThis as {
      require?: (moduleId: string) => unknown;
    }
  ).require;
  if (!req) return;
  try {
    (
      req('fs') as {
        appendFileSync: (path: string, text: string) => void;
      }
    ).appendFileSync('/opt/cursor/logs/debug.log', `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore logging failures
  }
};

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

/**
 * Fixes a folded-link edge case where clicking right of a line-ending link
 * can place the cursor inside hidden URL syntax.
 */
const cursorAtEndOfLineEndingFoldedLinkExtension = EditorView.domEventHandlers({
  mousedown: (e: MouseEvent, view: EditorView) => {
    // #region agent log
    appendDebugLog({
      hypothesisId: 'A',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'mousedown entry',
      data: {
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        defaultPrevented: e.defaultPrevented,
        targetTag: e.target instanceof Element ? e.target.tagName : 'non-element',
        targetClass: e.target instanceof Element ? e.target.className : '',
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;

    const target = e.target;
    if (!(target instanceof Element)) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'A',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'return false: target not Element',
        data: {},
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    const clickPos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    // #region agent log
    appendDebugLog({
      hypothesisId: 'B',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'resolved target line and click pos',
      data: {
        hasLineFromTarget: target.closest('.cm-line') instanceof HTMLElement,
        clickPos,
        clickLineFromPos: clickPos === null ? null : view.state.doc.lineAt(clickPos).number,
      },
      timestamp: Date.now(),
    });
    // #endregion
    const renderedLinks = [
      ...view.dom.querySelectorAll<HTMLElement>('.cm-rendered-link'),
    ];
    if (renderedLinks.length === 0) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'B',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'return false: no rendered links in viewport',
        data: {
          targetClass: target.className,
        },
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    const yTolerance = view.defaultLineHeight * 0.75;
    let rightmostLinkToLeftOfClick: HTMLElement | undefined;
    let smallestVerticalDistance = Number.POSITIVE_INFINITY;
    let rightmostBoundary = -Infinity;
    for (const link of renderedLinks) {
      const { top, bottom, right } = link.getBoundingClientRect();
      if (e.clientX <= right) continue;
      const verticalDistance =
        e.clientY < top ? top - e.clientY : e.clientY > bottom ? e.clientY - bottom : 0;
      if (verticalDistance > yTolerance) continue;
      if (
        verticalDistance < smallestVerticalDistance ||
        (verticalDistance === smallestVerticalDistance && right > rightmostBoundary)
      ) {
        smallestVerticalDistance = verticalDistance;
        rightmostBoundary = right;
        rightmostLinkToLeftOfClick = link;
      }
    }
    // #region agent log
    appendDebugLog({
      hypothesisId: 'C',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'candidate link scan result',
      data: {
        renderedLinks: renderedLinks.length,
        yTolerance,
        smallestVerticalDistance:
          smallestVerticalDistance === Number.POSITIVE_INFINITY
            ? null
            : smallestVerticalDistance,
        rightmostBoundary,
        candidateFound: !!rightmostLinkToLeftOfClick,
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (!rightmostLinkToLeftOfClick) return false;

    const pos = view.posAtDOM(rightmostLinkToLeftOfClick, 0);
    const linkRange = getLinkRange(view, pos);
    if (!linkRange) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'D',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'return false: no link range at posAtDOM',
        data: {
          posAtDOM: pos,
        },
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    // Only snap when that folded link reaches the end of the visual line.
    const lineTo = view.state.doc.lineAt(linkRange.to).to;
    // #region agent log
    appendDebugLog({
      hypothesisId: 'E',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'link range + eol check',
      data: {
        posAtDOM: pos,
        linkFrom: linkRange.from,
        linkTo: linkRange.to,
        lineTo,
        isLineEnding: lineTo === linkRange.to,
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (lineTo !== linkRange.to) return false;

    view.dispatch({ selection: { anchor: linkRange.to } });
    // #region agent log
    appendDebugLog({
      hypothesisId: 'E',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'selection dispatched',
      data: {
        anchor: view.state.selection.main.anchor,
      },
      timestamp: Date.now(),
    });
    // #endregion
    return true;
  },
});

export const clickLinkExtension = [
  cursorAtEndOfLineEndingFoldedLinkExtension,
  clickFullLinkExtension,
  addClassToUrl,
  clickRawUrlExtension,
];
