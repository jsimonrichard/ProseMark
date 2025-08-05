import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState } from '@codemirror/state';
import DOMPurify from 'dompurify';
import type { SyntaxNodeRef } from '@lezer/common';

class HTMLWidget extends WidgetType {
  constructor(public value: string) {
    super();
  }

  toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-html-widget';
    const parsed = new DOMParser().parseFromString(
      DOMPurify.sanitize(this.value),
      'text/html',
    );

    const walk = (root: Node) => {
      for (const node of [...root.childNodes]) {
        if (node.nodeType === 3) {
          // this node is a text node
          if (/^\s*$/.test(node.nodeValue ?? '')) {
            node.remove();
            continue;
          }

          node.textContent =
            node.textContent?.replace(/[\t\n\r ]+/g, ' ').trim() ?? null;
        } else {
          walk(node);
        }
      }
    };

    walk(parsed.body);

    el.append(...parsed.body.childNodes);
    return el;
  }

  // allows clicks to pass through to the editor
  ignoreEvent(_event: Event) {
    return false;
    // return event.type !== 'mousedown'; // don't preventDefault for mousedown
  }

  destroy(dom: HTMLElement): void {
    dom.remove();
  }
}

const htmlBlockTheme = EditorView.theme({
  '.cm-html-widget': {
    padding: '0 2px 0 6px;',
    borderRadius: '0.5rem',
  },
});

export const htmlBlockExtension = [
  foldableSyntaxFacet.of({
    nodePath: 'HTMLBlock',
    onFold: (state: EditorState, node: SyntaxNodeRef) => {
      return Decoration.replace({
        widget: new HTMLWidget(state.doc.sliceString(node.from, node.to)),
        block: true,
        inclusive: true,
      }).range(node.from, node.to);
    },
  }),
  htmlBlockTheme,
  selectAllDecorationsOnSelectExtension('cm-html-widget'),
];
