import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState, Extension } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

import { latexMathDelimiterTag, latexMathFormulaTag } from './markdown';

export {
  latexMathDelimiterTag,
  latexMathFormulaTag,
  latexMathMarkdownSyntaxExtension,
} from './markdown';

const WIDGET_CLASS = 'cm-latex-math';

export type LatexMathOutput = 'svg' | 'html';

export interface LatexMarkdownEditorOptions {
  /**
   * How formulas are rendered. `svg` uses MathJax SVG output (`tex-svg.js`).
   * `html` uses MathJax CHTML output (`tex-chtml.js`) for environments where
   * SVG is problematic.
   */
  output?: LatexMathOutput;
  /**
   * Max entries for the in-memory render cache (cloned DOM per hit). Helps when
   * the same formula is re-folded while moving the caret. Set to `0` to disable.
   * @default 128
   */
  renderCacheSize?: number;
}

interface MathJaxReady {
  tex2svgPromise: (
    tex: string,
    options: { display: boolean },
  ) => Promise<HTMLElement>;
  tex2chtmlPromise?: (
    tex: string,
    options: { display: boolean },
  ) => Promise<HTMLElement>;
  startup: { promise: Promise<void> };
}

interface MathJaxConfig {
  options?: { skipStartupTypeset?: boolean };
  tex?: Record<string, unknown>;
  svg?: Record<string, unknown>;
  startup?: Record<string, unknown>;
}

declare global {
  interface Window {
    MathJax?: MathJaxReady | MathJaxConfig;
  }
}

let loadedOutput: LatexMathOutput | null = null;
let mathJaxReady: Promise<void> | null = null;

const ensureMathJax = (output: LatexMathOutput): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      '@prosemark/latex requires a browser environment (window/document).',
    );
  }

  if (loadedOutput === output && mathJaxReady) {
    return mathJaxReady;
  }

  if (loadedOutput !== null && loadedOutput !== output) {
    throw new Error(
      'MathJax output mode is fixed after the first load; do not mix svg and html in one page.',
    );
  }

  loadedOutput = output;
  mathJaxReady = (async () => {
    // MathJax merges a pre-existing `window.MathJax` without `version` into
    // `config` and replaces the root. If we put `tex` / `svg` only on the
    // pre-load object, those options end up under `config` and TeX/SVG input
    // never activates — only set `skipStartupTypeset` here; defaults supply
    // the rest after the bundle runs.
    window.MathJax = {
      options: {
        skipStartupTypeset: true,
      },
    };

    if (output === 'svg') {
      await import('mathjax/tex-svg.js');
    } else {
      await import('mathjax/tex-chtml.js');
    }

    const mj = window.MathJax as MathJaxReady | undefined;
    const ready = mj?.startup.promise;
    if (!ready) {
      throw new Error('MathJax failed to initialize');
    }
    await ready;
  })();

  return mathJaxReady;
};

interface RenderCacheEntry {
  node: HTMLElement;
}

/** Move key to MRU end in O(1) using a Map as insertion-ordered list. */
class RenderLru {
  private readonly max: number;
  private readonly map = new Map<string, RenderCacheEntry>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): HTMLElement | undefined {
    const ent = this.map.get(key);
    if (!ent) return undefined;
    this.map.delete(key);
    this.map.set(key, ent);
    return ent.node;
  }

  set(key: string, node: HTMLElement): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { node });
    while (this.map.size > this.max) {
      const iter = this.map.keys().next();
      if (iter.done) break;
      this.map.delete(iter.value);
    }
  }
}

let renderCache: RenderLru | null = null;

const cacheKey = (output: LatexMathOutput, display: boolean, tex: string): string =>
  `${output}\n${display ? '1' : '0'}\n${tex}`;

const renderOrCloneFromCache = async (
  tex: string,
  display: boolean,
  output: LatexMathOutput,
): Promise<HTMLElement> => {
  const key = cacheKey(output, display, tex);
  const cached = renderCache?.get(key);
  if (cached) {
    return cached.cloneNode(true) as HTMLElement;
  }

  const mj = window.MathJax as MathJaxReady | undefined;
  if (!mj) {
    throw new Error('MathJax is not loaded');
  }

  let node: HTMLElement;
  if (output === 'html') {
    const fn = mj.tex2chtmlPromise;
    if (!fn) {
      throw new Error('MathJax HTML output is not loaded (tex-chtml bundle).');
    }
    node = await fn.call(mj, tex, { display });
  } else {
    node = await mj.tex2svgPromise(tex, { display });
  }

  renderCache?.set(key, node);
  return node.cloneNode(true) as HTMLElement;
};

const blockMathEstimatedHeightPx = 56;

class LatexMathWidget extends WidgetType {
  constructor(
    public readonly tex: string,
    public readonly display: boolean,
    public readonly output: LatexMathOutput,
  ) {
    super();
  }

  eq(other: LatexMathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.output === other.output
    );
  }

  get estimatedHeight(): number {
    return this.display ? blockMathEstimatedHeightPx : -1;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement(this.display ? 'div' : 'span');
    wrap.className = WIDGET_CLASS;
    wrap.setAttribute('data-latex', this.tex);
    wrap.setAttribute('data-display', this.display ? 'block' : 'inline');

    const requestLayoutMeasure = () => {
      if (!this.display) return;
      view.requestMeasure({ read: () => undefined });
    };

    void ensureMathJax(this.output)
      .then(() => renderOrCloneFromCache(this.tex, this.display, this.output))
      .then((node) => {
        wrap.replaceChildren(node);
        requestLayoutMeasure();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        wrap.textContent = this.tex;
        wrap.title = msg;
        wrap.classList.add(`${WIDGET_CLASS}-error`);
        requestLayoutMeasure();
      });

    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }

  destroy(dom: HTMLElement): void {
    dom.remove();
  }
}

const latexMathSourceTheme = EditorView.theme({
  '.cm-latex-math-delimiter': {
    color: 'var(--pm-latex-math-delimiter-color, var(--pm-link-color))',
  },
  '.cm-latex-math-formula': {
    color: 'var(--pm-latex-math-formula-color, inherit)',
    fontFamily: `var(
      --pm-latex-math-formula-font,
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

/**
 * Syntax highlighting for raw `$...$` / `$$...$$` spans before they are replaced
 * by rendered math widgets. Add next to {@link prosemarkBaseThemeSetup} or your
 * editor theme so delimiter and formula regions pick up theme variables.
 */
export const latexMathSyntaxHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: latexMathDelimiterTag,
      class: 'cm-latex-math-delimiter',
    },
    {
      tag: latexMathFormulaTag,
      class: 'cm-latex-math-formula',
    },
  ]),
);

const latexMathWidgetTheme = EditorView.theme({
  [`.${WIDGET_CLASS}`]: {
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  [`.${WIDGET_CLASS}[data-display="block"]`]: {
    display: 'block',
    textAlign: 'center',
    margin: '0.5em 0',
  },
  [`.${WIDGET_CLASS}-error`]: {
    color: '#b00020',
    fontFamily: 'monospace',
  },
});

/**
 * CodeMirror extensions that replace `LatexMath` syntax nodes with rendered
 * formulas. Pair with {@link latexMathMarkdownSyntaxExtension} on the Markdown
 * parser configuration, and add {@link latexMathSyntaxHighlighting} for source
 * coloring.
 */
export function latexMarkdownEditorExtensions(
  options: LatexMarkdownEditorOptions = {},
): ReturnType<typeof foldableSyntaxFacet.of>[] {
  const output: LatexMathOutput = options.output ?? 'svg';
  const cacheSize = options.renderCacheSize ?? 128;
  renderCache = cacheSize > 0 ? new RenderLru(cacheSize) : null;

  return [
    foldableSyntaxFacet.of({
      nodePath: 'LatexMath',
      buildDecorations: (state: EditorState, node: SyntaxNodeRef) => {
        const display =
          state.doc.sliceString(node.from, node.from + 2) === '$$';
        const innerFrom = display ? node.from + 2 : node.from + 1;
        const innerTo = display ? node.to - 2 : node.to - 1;
        const tex = state.doc.sliceString(innerFrom, innerTo).trim();
        if (!tex) return;

        return Decoration.replace({
          widget: new LatexMathWidget(tex, display, output),
          block: display,
          inclusive: true,
          // Skipped by revealBlockOnArrowExtension so ↑ through blank lines after math is normal.
          proseMarkSkipAdjacentArrowReveal: true,
        }).range(node.from, node.to);
      },
    }),
    latexMathWidgetTheme,
    selectAllDecorationsOnSelectExtension(WIDGET_CLASS),
  ];
}

/**
 * Convenience bundle: source highlighting theme + delimiter/formula tag
 * styles. Does not include {@link latexMarkdownEditorExtensions} (widgets).
 */
export const latexMarkdownSyntaxTheme: Extension[] = [
  latexMathSyntaxHighlighting,
  latexMathSourceTheme,
];
