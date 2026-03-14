import { EditorView } from 'codemirror';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { eventHandlersWithClass, iterChildren } from './utils';
import { markdownTags } from './markdown/tags';
import { Facet } from '@codemirror/state';

interface DebugLogPayload {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const appendDebugLog = (payload: DebugLogPayload): void => {
  const req = (
    globalThis as {
      require?: (moduleId: string) => unknown;
    }
  ).require;
  if (!req) return;
  try {
    const fsModule = req('fs') as {
      appendFileSync: (path: string, data: string) => void;
    };
    fsModule.appendFileSync(
      '/opt/cursor/logs/debug.log',
      `${JSON.stringify(payload)}\n`,
    );
  } catch {
    // ignore logging failures in non-node runtimes
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
        // #region agent log
        appendDebugLog({
          hypothesisId: 'D',
          location: 'clickLink.ts:clickFullLinkExtension',
          message: 'Rendered link mousedown handler invoked',
          data: {
            targetClass:
              e.target instanceof Element ? e.target.className : 'non-element',
            clientX: e.clientX,
            clientY: e.clientY,
          },
          timestamp: Date.now(),
        });
        // #endregion
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
      message: 'Folded-link end-of-line mousedown entry',
      data: {
        defaultPrevented: e.defaultPrevented,
        button: e.button,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        targetTag: e.target instanceof Element ? e.target.tagName : 'non-element',
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
        message: 'Skip handler because target is not an Element',
        data: {},
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    const line = target.closest('.cm-line');
    if (!(line instanceof HTMLElement)) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'B',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'Skip handler because click target is not in .cm-line',
        data: {
          targetClass: target.className,
        },
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    const renderedLinks = [...line.querySelectorAll<HTMLElement>('.cm-rendered-link')];
    if (renderedLinks.length === 0) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'B',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'Skip handler because no rendered links were found on line',
        data: {
          lineText: line.textContent,
        },
        timestamp: Date.now(),
      });
      // #endregion
      return false;
    }

    let rightmostLinkToLeftOfClick: HTMLElement | undefined;
    let rightmostBoundary = -Infinity;
    for (const link of renderedLinks) {
      const { right } = link.getBoundingClientRect();
      if (e.clientX <= right) continue;
      if (right > rightmostBoundary) {
        rightmostBoundary = right;
        rightmostLinkToLeftOfClick = link;
      }
    }
    // #region agent log
    appendDebugLog({
      hypothesisId: 'B',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'Rendered-link candidate scan completed',
      data: {
        renderedLinksCount: renderedLinks.length,
        clientX: e.clientX,
        clientY: e.clientY,
        candidateFound: !!rightmostLinkToLeftOfClick,
        rightmostBoundary,
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (!rightmostLinkToLeftOfClick) return false;

    const pos = view.posAtDOM(rightmostLinkToLeftOfClick, 0);
    // #region agent log
    appendDebugLog({
      hypothesisId: 'C',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'Resolved DOM position for rendered link',
      data: {
        pos,
      },
      timestamp: Date.now(),
    });
    // #endregion
    const linkRange = getLinkRange(view, pos);
    if (!linkRange) {
      // #region agent log
      appendDebugLog({
        hypothesisId: 'C',
        location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
        message: 'No Link node range found from resolved DOM position',
        data: {
          pos,
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
      message: 'Computed Link range and line-ending check',
      data: {
        linkFrom: linkRange.from,
        linkTo: linkRange.to,
        lineTo,
        isLineEnding: lineTo === linkRange.to,
        trailingContext: view.state.doc.sliceString(
          Math.max(0, linkRange.to - 6),
          Math.min(view.state.doc.length, linkRange.to + 2),
        ),
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (lineTo !== linkRange.to) return false;

    view.dispatch({ selection: { anchor: linkRange.to } });
    // #region agent log
    appendDebugLog({
      hypothesisId: 'D',
      location: 'clickLink.ts:cursorAtEndOfLineEndingFoldedLinkExtension',
      message: 'Dispatched selection to linkRange.to',
      data: {
        anchorAfterDispatch: view.state.selection.main.anchor,
        headAfterDispatch: view.state.selection.main.head,
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
