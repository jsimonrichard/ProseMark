import { EditorView } from 'codemirror';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { eventHandlersWithClass, iterChildren } from './utils';
import { markdownTags } from './markdown/tags';
import { Facet } from '@codemirror/state';
import { visiblePosAtCoords } from './hide/core';

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

/** Resolve a click position, correcting for font-size-0 hidden tokens. */
function posAtClick(view: EditorView, event: MouseEvent): number | null {
  const coords = { x: event.clientX, y: event.clientY };
  return visiblePosAtCoords(view, coords) ?? view.posAtCoords(coords);
}

export type ClickLinkHandler = (link: string) => void;

/**
 * Hosts override the default by providing a later `clickLinkHandler.of(...)`.
 * Only the highest-precedence handler runs (last registered wins).
 */
export const clickLinkHandler = Facet.define<
  ClickLinkHandler,
  ClickLinkHandler
>({
  combine(handlers) {
    const handler = handlers[handlers.length - 1];
    if (!handler) {
      return (url: string) => {
        throw new Error(
          `No clickLinkHandler registered (url=${JSON.stringify(url)})`,
        );
      };
    }
    return handler;
  },
});

export const defaultClickLinkHandler = clickLinkHandler.of((url) => {
  window.open(url, '_blank');
});

const clickFullLinkExtension = EditorView.domEventHandlers(
  eventHandlersWithClass({
    mousedown: {
      'cm-rendered-link': (e: MouseEvent, view: EditorView) => {
        const pos = posAtClick(view, e);
        if (pos === null) {
          return;
        }

        const url = getUrlFromLink(view, pos);
        if (!url) {
          return;
        }

        view.state.facet(clickLinkHandler)(url);
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
        const pos = posAtClick(view, e);
        if (pos === null) {
          return;
        }

        const url = getRawUrl(view, pos);
        if (!url) {
          return;
        }

        view.state.facet(clickLinkHandler)(url);
      },
    },
  }),
);

export const clickLinkExtension = [
  clickFullLinkExtension,
  addClassToUrl,
  clickRawUrlExtension,
];
