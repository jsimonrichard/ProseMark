import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  clickLinkHandler,
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState } from '@codemirror/state';
import DOMPurify from 'dompurify';
import type { SyntaxNodeRef } from '@lezer/common';
import { htmlBlockNeedsDivWrapper } from './htmlBlockRoot';
import { isHtmlOnlyParagraph } from './htmlOnlyContent';
import { eventTargetForClosest, htmlWidgetLinkHref } from './htmlWidgetLink';

export {
  multiParHTMLBlockMarkdownSyntaxExtension,
  htmlBlockContinuationMarkdownSyntaxExtension,
  renderHtmlMarkdownSyntaxExtensions,
} from './markdown';

const WIDGET_ROOT_CLASS = 'cm-html-widget';
const WIDGET_CONTENT_CLASS = 'cm-html-widget__content';

const htmlWidgetResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

class HTMLWidget extends WidgetType {
  constructor(public value: string) {
    super();
  }

  eq(other: HTMLWidget): boolean {
    return this.value === other.value;
  }

  toDOM(view: EditorView): HTMLElement {
    const root = document.createElement('div');
    root.className = WIDGET_ROOT_CLASS;

    const inner = document.createElement('div');
    inner.className = WIDGET_CONTENT_CLASS;

    const parsed = new DOMParser().parseFromString(
      DOMPurify.sanitize(this.value),
      'text/html',
    );

    const walk = (n: Node) => {
      for (const child of [...n.childNodes]) {
        if (child.nodeType === 3) {
          if (/^\s*$/.test(child.nodeValue ?? '')) {
            child.remove();
            continue;
          }

          child.textContent =
            child.textContent?.replace(/[\t\n\r ]+/g, ' ').trim() ?? null;
        } else {
          walk(child);
        }
      }
    };

    walk(parsed.body);
    if (htmlBlockNeedsDivWrapper(parsed.body)) {
      const wrap = document.createElement('div');
      wrap.append(...parsed.body.childNodes);
      inner.appendChild(wrap);
    } else {
      inner.append(...parsed.body.childNodes);
    }
    root.appendChild(inner);

    // Suppress native/editor handling on press; activate on click so keyboard
    // (Enter/Space on a focused `<a>`) and pointer share one path.
    root.addEventListener('mousedown', (event) => {
      if (htmlWidgetLinkHref(eventTargetForClosest(event.target)) == null) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    });
    root.addEventListener('click', (event) => {
      const href = htmlWidgetLinkHref(eventTargetForClosest(event.target));
      if (href == null) return;
      event.preventDefault();
      event.stopPropagation();
      view.state.facet(clickLinkHandler)(href);
    });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        view.requestMeasure();
      });
      ro.observe(root);
      htmlWidgetResizeObservers.set(root, ro);
    }

    requestAnimationFrame(() => {
      view.requestMeasure();
    });

    return root;
  }

  ignoreEvent(event: Event): boolean {
    // True → editor ignores (widget owns the event). False → cursor placement.
    return htmlWidgetLinkHref(eventTargetForClosest(event.target)) != null;
  }

  destroy(dom: HTMLElement): void {
    htmlWidgetResizeObservers.get(dom)?.disconnect();
    htmlWidgetResizeObservers.delete(dom);
    dom.remove();
  }
}

const htmlBlockTheme = EditorView.theme({
  [`.${WIDGET_ROOT_CLASS}`]: {
    // Block replace widgets: no vertical margin on the root (CodeMirror layout).
    display: 'flow-root',
    boxSizing: 'border-box',
    padding: '0 2px 0 6px',
    borderRadius: '0.5rem',
  },
  [`.${WIDGET_CONTENT_CLASS}`]: {
    // Contain margins from rendered HTML (headings, lists, etc.) so they do not
    // collapse outside the widget box and confuse line-height measurement.
    display: 'flow-root',
    minHeight: '1px',
  },
});

const htmlWidgetReplaceDecoration = (state: EditorState, node: SyntaxNodeRef) =>
  Decoration.replace({
    widget: new HTMLWidget(state.doc.sliceString(node.from, node.to)),
    block: true,
    inclusive: true,
    proseMarkSkipAdjacentArrowReveal: true,
  }).range(node.from, node.to);

export const htmlBlockExtension = [
  foldableSyntaxFacet.of({
    nodePath: 'HTMLBlock',
    buildDecorations: htmlWidgetReplaceDecoration,
  }),
  // Lone inline HTML in a paragraph (e.g. `<span>…</span>`) stays a Paragraph
  // with HTMLTag children — fold it when the paragraph is HTML-only.
  foldableSyntaxFacet.of({
    nodePath: 'Paragraph',
    buildDecorations: (state, node) => {
      if (!isHtmlOnlyParagraph(state, node)) return;
      return htmlWidgetReplaceDecoration(state, node);
    },
  }),
  htmlBlockTheme,
  selectAllDecorationsOnSelectExtension(WIDGET_ROOT_CLASS),
];
