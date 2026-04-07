import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import {
  foldableSyntaxFacet,
  selectAllDecorationsOnSelectExtension,
} from '@prosemark/core';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';

export { markdownLatexMathSyntaxExtension } from './markdown';

const WIDGET_CLASS = 'cm-latex-math';

export type LatexMathOutput = 'svg' | 'html';

export interface MarkdownLatexOptions {
  /**
   * How formulas are rendered. `svg` uses MathJax SVG output (`tex-svg.js`).
   * `html` uses MathJax CHTML output (`tex-chtml.js`) for environments where
   * SVG is problematic.
   */
  output?: LatexMathOutput;
  /**
   * URL of the MathJax combined component script to load. If omitted, a
   * pinned jsDelivr URL matching `output` is used.
   */
  mathJaxScriptUrl?: string;
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

const MATHJAX_SCRIPT_ID = 'prosemark-mathjax';

const defaultScriptUrl = (output: LatexMathOutput): string =>
  output === 'svg'
    ? 'https://cdn.jsdelivr.net/npm/mathjax@4.1.1/tex-svg.js'
    : 'https://cdn.jsdelivr.net/npm/mathjax@4.1.1/tex-chtml.js';

let activeMathJaxScriptUrl: string | null = null;
let mathJaxReady: Promise<void> | null = null;

const ensureMathJax = (scriptUrl: string): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      '@prosemark/markdown-latex requires a browser environment (window/document).',
    );
  }

  if (activeMathJaxScriptUrl === scriptUrl && mathJaxReady) {
    return mathJaxReady;
  }

  if (
    activeMathJaxScriptUrl !== null &&
    activeMathJaxScriptUrl !== scriptUrl
  ) {
    document.getElementById(MATHJAX_SCRIPT_ID)?.remove();
    delete window.MathJax;
    mathJaxReady = null;
  }

  activeMathJaxScriptUrl = scriptUrl;
  mathJaxReady = new Promise<void>((resolve, reject) => {
    window.MathJax = {
      options: {
        skipStartupTypeset: true,
      },
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['$$', '$$']],
      },
      svg: { fontCache: 'global' },
    };

    const script = document.createElement('script');
    script.id = MATHJAX_SCRIPT_ID;
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const mj = window.MathJax as MathJaxReady | undefined;
      const ready = mj?.startup.promise;
      if (!ready) {
        reject(new Error('MathJax failed to initialize'));
        return;
      }
      void ready
        .then(() => {
          resolve();
        })
        .catch(reject);
    };
    script.onerror = () => {
      reject(new Error(`Failed to load MathJax from ${scriptUrl}`));
    };
    document.head.append(script);
  });

  return mathJaxReady;
};

const renderPromise = (
  tex: string,
  display: boolean,
  output: LatexMathOutput,
): Promise<HTMLElement> => {
  const mj = window.MathJax as MathJaxReady | undefined;
  if (!mj) {
    return Promise.reject(new Error('MathJax is not loaded'));
  }
  if (output === 'html') {
    const fn = mj.tex2chtmlPromise;
    if (!fn) {
      return Promise.reject(
        new Error('MathJax HTML output is not loaded (use tex-chtml.js).'),
      );
    }
    return fn.call(mj, tex, { display });
  }
  return mj.tex2svgPromise(tex, { display });
};

class LatexMathWidget extends WidgetType {
  constructor(
    public readonly tex: string,
    public readonly display: boolean,
    public readonly output: LatexMathOutput,
    public readonly scriptUrl: string,
  ) {
    super();
  }

  eq(other: LatexMathWidget): boolean {
    return (
      this.tex === other.tex &&
      this.display === other.display &&
      this.output === other.output &&
      this.scriptUrl === other.scriptUrl
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement(this.display ? 'div' : 'span');
    wrap.className = WIDGET_CLASS;
    wrap.setAttribute('data-latex', this.tex);
    wrap.setAttribute('data-display', this.display ? 'block' : 'inline');

    void ensureMathJax(this.scriptUrl)
      .then(() => renderPromise(this.tex, this.display, this.output))
      .then((node) => {
        wrap.replaceChildren(node);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        wrap.textContent = this.tex;
        wrap.title = msg;
        wrap.classList.add(`${WIDGET_CLASS}-error`);
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

const latexMathTheme = EditorView.theme({
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
 * CodeMirror decorations that replace `LatexMath` syntax nodes with rendered
 * formulas. Pair with {@link markdownLatexMathSyntaxExtension} on the Markdown
 * parser configuration.
 */
export function markdownLatexExtension(
  options: MarkdownLatexOptions = {},
): ReturnType<typeof foldableSyntaxFacet.of>[] {
  const output: LatexMathOutput = options.output ?? 'svg';
  const scriptUrl = options.mathJaxScriptUrl ?? defaultScriptUrl(output);

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
          widget: new LatexMathWidget(tex, display, output, scriptUrl),
          block: display,
          inclusive: true,
        }).range(node.from, node.to);
      },
    }),
    latexMathTheme,
    selectAllDecorationsOnSelectExtension(WIDGET_CLASS),
  ];
}
