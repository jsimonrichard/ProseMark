import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState, Extension } from '@codemirror/state';
import { StateEffect, StateField } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { $typst } from '@myriaddreamin/typst.ts/contrib/snippet';

import { typstMathDelimiterTag, typstMathFormulaTag } from './markdown';
import {
  defaultCompilerWasmUrl,
  defaultRendererWasmUrl,
} from './typstWasmUrls';

export {
  defaultCompilerWasmUrl,
  defaultRendererWasmUrl,
  jsdelivrTypstWasmUrls,
  TYPST_TS_VERSION,
} from './typstWasmUrls';

export {
  typstMathDelimiterTag,
  typstMathFormulaTag,
  typstMathMarkdownSyntaxExtension,
} from './markdown';

/** CSS class on rendered math widget roots (span/div). */
export const typstMathWidgetClass = 'cm-typst-math';

/** `data-typst-ink-fill` on rendered widget roots (resolved typst fill). */
export const typstMathWidgetInkFillAttribute = 'data-typst-ink-fill';

/** Bump when widget DOM/debug attributes change (helps verify deploy cache). */
const TYPST_MATH_WIDGET_VERSION = '3';

const WIDGET_CLASS = typstMathWidgetClass;
const typstMathWidgetInkFillAttr = typstMathWidgetInkFillAttribute;

export interface TypstMarkdownEditorOptions {
  /**
   * Max entries for the in-memory render cache (cloned SVG roots per hit).
   * @default 128
   */
  renderCacheSize?: number;
  /**
   * URL for the web compiler `.wasm` (passed to typst.ts `getModule`).
   * @default jsDelivr URL for `@myriaddreamin/typst-ts-web-compiler` (see {@link defaultCompilerWasmUrl}).
   */
  compilerWasmUrl?: string;
  /**
   * URL for the renderer `.wasm` (passed to typst.ts `getModule`).
   * @default jsDelivr URL for `@myriaddreamin/typst-ts-renderer` (see {@link defaultRendererWasmUrl}).
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
const mathToTypstDocument = (
  body: string,
  display: boolean,
  inkFill: string,
): string => {
  const src = body.trim();
  const page =
    '#set page(width: auto, height: auto, margin: 0pt, fill: none)\n';
  const colorRule = `#show math.equation: set text(fill: ${inkFill})\n`;
  if (display) {
    return `${page}${colorRule}#align(center)[#block(inset: 4pt)[$ ${src} $]]`;
  }
  return `${page}${colorRule}$${src}$`;
};

/** Convert a resolved CSS color to a Typst `rgb("#…")` fill expression. */
const cssColorToTypstFill = (cssColor: string): string => {
  const trimmed = cssColor.trim();
  const rgbMatch =
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/.exec(
      trimmed,
    );
  if (rgbMatch) {
    const parts = [rgbMatch[1], rgbMatch[2], rgbMatch[3]];
    if (parts.some((part) => part === undefined)) {
      return 'rgb("#000000")';
    }
    const hex = `#${parts
      .map((part) => Math.round(Number(part)).toString(16).padStart(2, '0'))
      .join('')}`;
    return `rgb("${hex}")`;
  }
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      if (r && g && b) {
        return `rgb("#${r}${r}${g}${g}${b}${b}")`;
      }
    }
    return `rgb("${trimmed}")`;
  }
  return 'rgb("#000000")';
};

const resolveEditorInkTypstFill = (view: EditorView): string =>
  cssColorToTypstFill(getComputedStyle(view.contentDOM).color);

const typstInkFillEffect = StateEffect.define<string>();

const typstInkFillField = StateField.define<string>({
  create: () => 'rgb("#000000")',
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(typstInkFillEffect)) return effect.value;
    }
    return value;
  },
});

const typstInkFillSyncPlugin = ViewPlugin.fromClass(
  class {
    private inkFill = '';
    private observer: MutationObserver | undefined;

    constructor(private view: EditorView) {
      this.inkFill = view.state.field(typstInkFillField);
      this.sync();
      if (typeof MutationObserver !== 'undefined') {
        this.observer = new MutationObserver(() => {
          this.sync();
        });
        this.observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'class', 'style'],
        });
      }
    }

    update(): void {
      this.sync();
    }

    private sync(): void {
      const next = resolveEditorInkTypstFill(this.view);
      if (next === this.inkFill) return;
      this.inkFill = next;
      this.view.dispatch({
        effects: typstInkFillEffect.of(next),
        selection: this.view.state.selection,
      });
    }

    destroy(): void {
      this.observer?.disconnect();
    }
  },
);

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
  inkFill: string,
  body: string,
): string =>
  `${compilerUrl}\n${rendererUrl}\n${display ? '1' : '0'}\n${inkFill}\n${body}`;

/** typst.ts inline math uses ~8pt viewBoxes; baseline ≈ 7.513pt (empirical). */
const TYPST_INLINE_MATH_VB_HEIGHT = 8;
const TYPST_INLINE_MATH_BASELINE_Y = TYPST_INLINE_MATH_VB_HEIGHT * (7.513 / 8);
const TYPST_INLINE_MATH_DESCENDER_PT =
  TYPST_INLINE_MATH_VB_HEIGHT - TYPST_INLINE_MATH_BASELINE_Y;
/** typst SVG user units are pt; typst body text is ~12pt per em. */
const TYPST_SVG_PT_PER_EM = 12;
/** Padding in typst pt units when expanding viewBox to ink bounds. */
const INLINE_TYPST_MATH_INK_PADDING_PT = 0.35;

const forceInlineSvgDisplay = (svg: SVGSVGElement): void => {
  svg.style.display = 'inline';
  svg.querySelectorAll('svg').forEach((node) => {
    node.style.display = 'inline';
  });
};

const parseTranslateY = (transform: string): number | null => {
  const re = /translate\s*\(\s*[^,\s)]+(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)/;
  const match = re.exec(transform);
  const y = match?.[1];
  return y !== undefined ? Number.parseFloat(y) : null;
};

const collectTypstGlyphBaselineCandidates = (svg: SVGSVGElement): number[] => {
  const ys: number[] = [];
  svg.querySelectorAll('[transform]').forEach((el) => {
    const y = parseTranslateY(el.getAttribute('transform') ?? '');
    if (y !== null && y > 0) ys.push(y);
  });
  return ys;
};

const typstMathBaselineY = (svg: SVGSVGElement): number => {
  const target = TYPST_INLINE_MATH_BASELINE_Y;
  const candidates = collectTypstGlyphBaselineCandidates(svg);
  if (candidates.length === 0) {
    try {
      const bbox = svg.getBBox();
      return bbox.y + bbox.height - TYPST_INLINE_MATH_DESCENDER_PT;
    } catch {
      return target;
    }
  }

  const best = candidates.reduce((chosen, y) => {
    const chosenDist = Math.abs(chosen - target);
    const yDist = Math.abs(y - target);
    return yDist < chosenDist ? y : chosen;
  });
  const bestDist = Math.abs(best - target);

  if (bestDist > 1.2) {
    try {
      const bbox = svg.getBBox();
      return bbox.y + bbox.height / 2;
    } catch {
      /* keep transform-based estimate */
    }
  }

  return best;
};

/**
 * typst.ts viewBoxes are often shorter than the ink (subscripts, fractions).
 * Grow the viewBox to getBBox so line layout reserves enough vertical space.
 */
const expandTypstSvgViewBoxToInk = (svg: SVGSVGElement): void => {
  let bbox: DOMRect;
  try {
    bbox = svg.getBBox();
  } catch {
    return;
  }
  if (bbox.width === 0 && bbox.height === 0) return;

  const vb = svg.viewBox.baseVal;
  const pad = INLINE_TYPST_MATH_INK_PADDING_PT;
  const x = Math.min(vb.x, bbox.x - pad);
  const y = Math.min(vb.y, bbox.y - pad);
  const right = Math.max(vb.x + vb.width, bbox.x + bbox.width + pad);
  const bottom = Math.max(vb.y + vb.height, bbox.y + bbox.height + pad);
  const width = right - x;
  const height = bottom - y;
  if (width <= 0 || height <= 0) return;

  svg.setAttribute(
    'viewBox',
    `${String(x)} ${String(y)} ${String(width)} ${String(height)}`,
  );
  svg.removeAttribute('width');
  svg.removeAttribute('height');
};

const typstSvgHeightEm = (viewHeight: number): number =>
  viewHeight / TYPST_SVG_PT_PER_EM;

/**
 * Inline SVG baselines default to the viewport bottom; typst math sits higher.
 * Shift each fragment down so the typst baseline meets surrounding text.
 */
const alignInlineTypstSvgBaseline = (svg: SVGSVGElement): void => {
  expandTypstSvgViewBoxToInk(svg);

  const vb = svg.viewBox.baseVal;
  if (!vb.height) return;

  const baselineY = typstMathBaselineY(svg);
  const slackBelowBaseline = vb.y + vb.height - baselineY;
  const heightEm = typstSvgHeightEm(vb.height);
  const offsetEm = (slackBelowBaseline / vb.height) * heightEm;

  svg.style.height = `${heightEm.toFixed(4)}em`;
  svg.style.width = 'auto';
  svg.style.verticalAlign = `-${offsetEm.toFixed(4)}em`;
};

/** Scale display math to em units (typst width/height attrs are too small in CSS). */
const sizeDisplayTypstSvg = (svg: SVGSVGElement): void => {
  expandTypstSvgViewBoxToInk(svg);

  const vb = svg.viewBox.baseVal;
  if (!vb.height) return;

  svg.style.display = 'block';
  svg.style.margin = '0 auto';
  svg.style.height = `${typstSvgHeightEm(vb.height).toFixed(4)}em`;
  svg.style.width = 'auto';
  svg.removeAttribute('width');
  svg.removeAttribute('height');
};

const alignInlineTypstWidgetBaselines = (wrap: HTMLElement): void => {
  wrap.style.verticalAlign = 'baseline';
  wrap.querySelectorAll('svg').forEach((node) => {
    if (node instanceof SVGSVGElement) {
      alignInlineTypstSvgBaseline(node);
    }
  });
};

const sizeDisplayTypstWidgetSvgs = (wrap: HTMLElement): void => {
  wrap.querySelectorAll('svg').forEach((node) => {
    if (node instanceof SVGSVGElement) {
      sizeDisplayTypstSvg(node);
    }
  });
};

const isBlackInk = (value: string): boolean => {
  const v = value.trim().toLowerCase().replace(/\s/g, '');
  return (
    v === '#000' ||
    v === '#000000' ||
    v === 'black' ||
    v === 'rgb(0,0,0)' ||
    v === 'rgb(0%,0%,0%)'
  );
};

/** Fallback when typst still emits #000 (e.g. before theme color is resolved). */
const applyCurrentColorToTypstSvg = (svg: SVGSVGElement): void => {
  svg.style.color = 'inherit';
  for (const attr of ['fill', 'stroke'] as const) {
    svg.querySelectorAll(`[${attr}]`).forEach((el) => {
      const value = el.getAttribute(attr);
      if (value && value !== 'none' && isBlackInk(value)) {
        el.setAttribute(attr, 'currentColor');
      }
    });
  }
};

/**
 * typst.ts SVG includes selection overlays (`foreignObject` / `.tsel`) whose
 * embedded CSS uses `position: fixed`, which breaks inline math in CodeMirror.
 * Keep vector glyphs (`use` + `defs`) only.
 */
const prepareTypstSvgForWidget = (
  svg: SVGSVGElement,
  inline: boolean,
): SVGSVGElement => {
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
  if (inline) {
    forceInlineSvgDisplay(svg);
  }
  applyCurrentColorToTypstSvg(svg);
  return svg;
};

/** typst.ts may return one SVG document or several sibling `<svg>` fragments. */
const typstSvgStringToElements = (
  raw: string,
  inline: boolean,
): SVGSVGElement[] => {
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
      return [prepareTypstSvgForWidget(el as unknown as SVGSVGElement, inline)];
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
  return roots.map((el) => prepareTypstSvgForWidget(el, inline));
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
  inkFill: string,
  compilerUrl: string,
  rendererUrl: string,
): Promise<SVGSVGElement[]> => {
  const key = cacheKey(compilerUrl, rendererUrl, display, inkFill, body);
  const cached = renderCache?.get(key);
  if (cached) {
    return cloneSvgNodes(cached);
  }

  const svg = await $typst.svg({
    mainContent: mathToTypstDocument(body, display, inkFill),
    ...typstSvgRenderOptions,
  });
  const nodes = typstSvgStringToElements(svg, !display);
  renderCache?.set(key, nodes);
  return cloneSvgNodes(nodes);
};

/** Extract human-readable messages from typst.ts / WASM diagnostic dumps. */
const formatTypstRenderError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err);
  const messages: string[] = [];
  const messageRe = /message:\s*"((?:\\.|[^"\\])*)"/g;
  for (let match = messageRe.exec(raw); match; match = messageRe.exec(raw)) {
    const text = match[1];
    if (text !== undefined) {
      messages.push(text.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    }
  }
  if (messages.length > 0) {
    return messages.join('; ');
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return 'Typst failed to render math';
  }
  return raw;
};

const blockMathEstimatedHeightPx = 72;

const typstWidgetResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

class TypstMathWidget extends WidgetType {
  constructor(
    public readonly body: string,
    public readonly display: boolean,
    public readonly inkFill: string,
    public readonly compilerWasmUrl: string,
    public readonly rendererWasmUrl: string,
  ) {
    super();
  }

  eq(other: TypstMathWidget): boolean {
    return (
      this.body === other.body &&
      this.display === other.display &&
      this.inkFill === other.inkFill &&
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

    wrap.setAttribute('data-typst-widget-version', TYPST_MATH_WIDGET_VERSION);
    const inkFill = resolveEditorInkTypstFill(view);
    wrap.setAttribute(typstMathWidgetInkFillAttr, inkFill);

    void ensureTypst(this.compilerWasmUrl, this.rendererWasmUrl)
      .then(() =>
        renderOrCloneFromCache(
          this.body,
          this.display,
          inkFill,
          this.compilerWasmUrl,
          this.rendererWasmUrl,
        ),
      )
      .then((nodes) => {
        wrap.setAttribute(typstMathWidgetInkFillAttr, inkFill);
        wrap.replaceChildren(...nodes);
        if (this.display) {
          sizeDisplayTypstWidgetSvgs(wrap);
        } else {
          alignInlineTypstWidgetBaselines(wrap);
        }
        view.requestMeasure();
      })
      .catch((err: unknown) => {
        const msg = formatTypstRenderError(err);
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
    verticalAlign: 'baseline',
    maxWidth: '100%',
    color: 'inherit',
  },
  // typst.ts may emit several sibling/nested <svg> nodes; they default to block
  // and stack vertically unless forced inline (block math centers via text-align).
  [`.${WIDGET_CLASS} svg`]: {
    maxWidth: '100%',
    color: 'inherit',
  },
  [`.${WIDGET_CLASS}[data-display="inline"] svg`]: {
    display: 'inline',
    verticalAlign: 'baseline',
    width: 'auto',
  },
  [`.${WIDGET_CLASS}[data-display="block"] svg`]: {
    display: 'block',
    margin: '0 auto',
    width: 'auto',
  },
  [`.${WIDGET_CLASS}[data-display="block"]`]: {
    display: 'block',
    textAlign: 'center',
    padding: '0.5em 0',
  },
  [`.${WIDGET_CLASS}.${WIDGET_CLASS}-error`]: {
    color: '#b00020',
    fontFamily: 'monospace',
  },
});

export function typstMarkdownEditorExtensions(
  options: TypstMarkdownEditorOptions = {},
): Extension[] {
  const compilerWasmUrl = options.compilerWasmUrl ?? defaultCompilerWasmUrl();
  const rendererWasmUrl = options.rendererWasmUrl ?? defaultRendererWasmUrl();
  const cacheSize = options.renderCacheSize ?? 128;
  renderCache = cacheSize > 0 ? new RenderLru(cacheSize) : null;

  return [
    typstInkFillField,
    typstInkFillSyncPlugin,
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
        const inkFill = state.field(typstInkFillField);

        return Decoration.replace({
          widget: new TypstMathWidget(
            body,
            display,
            inkFill,
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
