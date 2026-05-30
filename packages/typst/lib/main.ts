import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState, Extension } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { $typst } from '@myriaddreamin/typst.ts/contrib/snippet';

import { typstMathDelimiterTag, typstMathFormulaTag } from './markdown';
import {
  defaultCompilerWasmUrl,
  defaultRendererWasmUrl,
} from './typstWasmUrls';

export {
  typstMathDelimiterTag,
  typstMathFormulaTag,
  typstMathMarkdownSyntaxExtension,
} from './markdown';

/** CSS class on rendered math widget roots (span/div). */
export const typstMathWidgetClass = 'cm-typst-math';

const WIDGET_CLASS = typstMathWidgetClass;

export interface TypstMarkdownEditorOptions {
  /**
   * Max entries for the in-memory render cache (cloned SVG roots per hit).
   * @default 128
   */
  renderCacheSize?: number;
  /**
   * URL for the web compiler `.wasm` (passed to typst.ts `getModule`).
   * @default Import of `@myriaddreamin/typst-ts-web-compiler`’s `.wasm` (your app bundler should emit a URL, e.g. Vite/webpack).
   */
  compilerWasmUrl?: string;
  /**
   * URL for the renderer `.wasm` (passed to typst.ts `getModule`).
   * @default Import of `@myriaddreamin/typst-ts-renderer`’s `.wasm` (your app bundler should emit a URL, e.g. Vite/webpack).
   */
  rendererWasmUrl?: string;
}

let typstInit: Promise<void> | null = null;
let configuredCompilerUrl: string | null = null;
let configuredRendererUrl: string | null = null;

const ensureTypst = (
  compilerWasmUrl: string,
  rendererWasmUrl: string,
): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      '@prosemark/typst requires a browser environment (window/document).',
    );
  }

  if (
    typstInit &&
    configuredCompilerUrl === compilerWasmUrl &&
    configuredRendererUrl === rendererWasmUrl
  ) {
    return typstInit;
  }

  if (
    typstInit &&
    (configuredCompilerUrl !== compilerWasmUrl ||
      configuredRendererUrl !== rendererWasmUrl)
  ) {
    throw new Error(
      'Typst WASM URLs are fixed after the first load in this page.',
    );
  }

  configuredCompilerUrl = compilerWasmUrl;
  configuredRendererUrl = rendererWasmUrl;
  typstInit = (async () => {
    $typst.setCompilerInitOptions({
      getModule: () => compilerWasmUrl,
    });
    $typst.setRendererInitOptions({
      getModule: () => rendererWasmUrl,
    });
    await $typst.svg({
      mainContent:
        '#set page(width: auto, height: auto, margin: 0pt, fill: none)\n$1$',
    });
  })();

  return typstInit;
};

/** Build a minimal Typst program that renders math in an auto-sized page. */
const mathToTypstDocument = (body: string, display: boolean): string => {
  const src = body.trim();
  const page =
    '#set page(width: auto, height: auto, margin: 0pt, fill: none)\n';
  if (display) {
    return `${page}#align(center)[#block(inset: 4pt)[$ ${src} $]]`;
  }
  return `${page}#box(inset: (y: 0.08em))[$${src}$]`;
};

interface RenderCacheEntry {
  nodes: SVGSVGElement[];
}

class RenderLru {
  private readonly max: number;
  private readonly map = new Map<string, RenderCacheEntry>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): SVGSVGElement[] | undefined {
    const ent = this.map.get(key);
    if (!ent) return undefined;
    this.map.delete(key);
    this.map.set(key, ent);
    return ent.nodes;
  }

  set(key: string, nodes: SVGSVGElement[]): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { nodes });
    while (this.map.size > this.max) {
      const iter = this.map.keys().next();
      if (iter.done) break;
      this.map.delete(iter.value);
    }
  }
}

let renderCache: RenderLru | null = null;

const cacheKey = (
  compilerUrl: string,
  rendererUrl: string,
  display: boolean,
  body: string,
): string => `${compilerUrl}\n${rendererUrl}\n${display ? '1' : '0'}\n${body}`;

const forceInlineSvgDisplay = (svg: SVGSVGElement): void => {
  svg.style.display = 'inline';
  svg.style.verticalAlign = 'middle';
  svg.querySelectorAll('svg').forEach((node) => {
    node.style.display = 'inline';
    node.style.verticalAlign = 'middle';
  });
};

/**
 * typst.ts SVG includes selection overlays (`foreignObject` / `.tsel`) whose
 * embedded CSS uses `position: fixed`, which breaks inline math in CodeMirror.
 * Keep vector glyphs (`use` + `defs`) only.
 */
const prepareTypstSvgForWidget = (svg: SVGSVGElement): SVGSVGElement => {
  svg.querySelectorAll('script').forEach((node) => {
    node.remove();
  });
  svg.querySelectorAll('foreignObject').forEach((node) => {
    node.remove();
  });
  svg.querySelectorAll('style').forEach((node) => {
    node.remove();
  });
  svg.style.overflow = 'visible';
  forceInlineSvgDisplay(svg);
  return svg;
};

/** typst.ts may return one SVG document or several sibling `<svg>` fragments. */
const typstSvgStringToElements = (raw: string): SVGSVGElement[] => {
  const trimmed = raw.trim();
  const svgTagCount = trimmed.match(/<svg[\s>]/gi)?.length ?? 0;

  if (svgTagCount <= 1) {
    const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
    const el = doc.documentElement;
    if (
      !doc.querySelector('parsererror') &&
      el.namespaceURI === 'http://www.w3.org/2000/svg' &&
      el.nodeName === 'svg'
    ) {
      return [prepareTypstSvgForWidget(el as unknown as SVGSVGElement)];
    }
  }

  const holder = document.createElement('div');
  holder.innerHTML = trimmed;
  const roots = [...holder.children].filter(
    (el): el is SVGSVGElement => el.tagName === 'svg',
  );
  if (roots.length === 0) {
    throw new Error('Typst did not return any <svg> element');
  }
  return roots.map((el) => prepareTypstSvgForWidget(el));
};

const cloneSvgNodes = (nodes: SVGSVGElement[]): SVGSVGElement[] =>
  nodes.map((node) => node.cloneNode(true) as SVGSVGElement);

const typstSvgRenderOptions = {
  data_selection: {
    body: true,
    defs: true,
    css: false,
    js: false,
  },
} as const;

const renderOrCloneFromCache = async (
  body: string,
  display: boolean,
  compilerUrl: string,
  rendererUrl: string,
): Promise<SVGSVGElement[]> => {
  const key = cacheKey(compilerUrl, rendererUrl, display, body);
  const cached = renderCache?.get(key);
  if (cached) {
    return cloneSvgNodes(cached);
  }

  const svg = await $typst.svg({
    mainContent: mathToTypstDocument(body, display),
    ...typstSvgRenderOptions,
  });
  const nodes = typstSvgStringToElements(svg);
  renderCache?.set(key, nodes);
  return cloneSvgNodes(nodes);
};

const blockMathEstimatedHeightPx = 72;

const typstWidgetResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

class TypstMathWidget extends WidgetType {
  constructor(
    public readonly body: string,
    public readonly display: boolean,
    public readonly compilerWasmUrl: string,
    public readonly rendererWasmUrl: string,
  ) {
    super();
  }

  eq(other: TypstMathWidget): boolean {
    return (
      this.body === other.body &&
      this.display === other.display &&
      this.compilerWasmUrl === other.compilerWasmUrl &&
      this.rendererWasmUrl === other.rendererWasmUrl
    );
  }

  get estimatedHeight(): number {
    return this.display ? blockMathEstimatedHeightPx : -1;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement(this.display ? 'div' : 'span');
    wrap.className = WIDGET_CLASS;
    wrap.setAttribute('data-typst-math', this.body);
    wrap.setAttribute('data-display', this.display ? 'block' : 'inline');

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        view.requestMeasure();
      });
      ro.observe(wrap);
      typstWidgetResizeObservers.set(wrap, ro);
    }

    void ensureTypst(this.compilerWasmUrl, this.rendererWasmUrl)
      .then(() =>
        renderOrCloneFromCache(
          this.body,
          this.display,
          this.compilerWasmUrl,
          this.rendererWasmUrl,
        ),
      )
      .then((nodes) => {
        wrap.replaceChildren(...nodes);
        view.requestMeasure();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        wrap.textContent = this.body;
        wrap.title = msg;
        wrap.classList.add(`${WIDGET_CLASS}-error`);
        view.requestMeasure();
      });

    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }

  destroy(dom: HTMLElement): void {
    typstWidgetResizeObservers.get(dom)?.disconnect();
    typstWidgetResizeObservers.delete(dom);
    dom.remove();
  }
}

const typstMathSourceTheme = EditorView.theme({
  '.cm-typst-math-delimiter': {
    color: 'var(--pm-typst-math-delimiter-color, var(--pm-link-color))',
  },
  '.cm-typst-math-formula': {
    color: 'var(--pm-typst-math-formula-color, inherit)',
    fontFamily: `var(
      --pm-typst-math-formula-font,
      var(
        --pm-code-font,
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        'Liberation Mono',
        'Courier New',
        monospace
      )
    )`,
    fontSize: '0.92em',
  },
});

export const typstMathSyntaxHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: typstMathDelimiterTag,
      class: 'cm-typst-math-delimiter',
    },
    {
      tag: typstMathFormulaTag,
      class: 'cm-typst-math-formula',
    },
  ]),
);

const typstMathWidgetTheme = EditorView.theme({
  [`.${WIDGET_CLASS}`]: {
    display: 'inline-block',
    verticalAlign: 'middle',
    maxWidth: '100%',
  },
  // typst.ts may emit several sibling/nested <svg> nodes; they default to block
  // and stack vertically unless forced inline (block math centers via text-align).
  [`.${WIDGET_CLASS} svg`]: {
    display: 'inline',
    verticalAlign: 'middle',
    maxWidth: '100%',
  },
  [`.${WIDGET_CLASS}[data-display="inline"] svg`]: {
    height: '1.05em',
    width: 'auto',
  },
  [`.${WIDGET_CLASS}[data-display="block"]`]: {
    display: 'block',
    textAlign: 'center',
    padding: '0.5em 0',
  },
  [`.${WIDGET_CLASS}-error`]: {
    color: '#b00020',
    fontFamily: 'monospace',
    lineHeight: 'normal',
  },
});

export function typstMarkdownEditorExtensions(
  options: TypstMarkdownEditorOptions = {},
): ReturnType<typeof foldableSyntaxFacet.of>[] {
  const compilerWasmUrl = options.compilerWasmUrl ?? defaultCompilerWasmUrl();
  const rendererWasmUrl = options.rendererWasmUrl ?? defaultRendererWasmUrl();
  const cacheSize = options.renderCacheSize ?? 128;
  renderCache = cacheSize > 0 ? new RenderLru(cacheSize) : null;

  return [
    foldableSyntaxFacet.of({
      nodePath: 'Math',
      buildDecorations: (state: EditorState, node: SyntaxNodeRef) => {
        const opensDouble =
          state.doc.sliceString(node.from, node.from + 2) === '$$';
        const innerFrom = opensDouble ? node.from + 2 : node.from + 1;
        const innerTo = opensDouble ? node.to - 2 : node.to - 1;
        const rawBody = state.doc.sliceString(innerFrom, innerTo);
        const body = rawBody.trim();
        if (!body) return;

        const display = opensDouble || /^\s|\s$/.test(rawBody);

        return Decoration.replace({
          widget: new TypstMathWidget(
            body,
            display,
            compilerWasmUrl,
            rendererWasmUrl,
          ),
          block: display,
          inclusive: true,
          proseMarkSkipAdjacentArrowReveal: true,
        }).range(node.from, node.to);
      },
    }),
    typstMathWidgetTheme,
    selectAllDecorationsOnSelectExtension(WIDGET_CLASS),
  ];
}

export const typstMarkdownSyntaxTheme: Extension[] = [
  typstMathSyntaxHighlighting,
  typstMathSourceTheme,
];
