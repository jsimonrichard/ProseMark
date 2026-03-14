import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import {
  FRONTMATTER_LANGUAGE_LABEL,
  isFrontmatterNode,
} from './markdown/frontmatter';

const fallbackMonospaceCodeFont =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
const codeFontFamily = `var(--pm-code-font, ${fallbackMonospaceCodeFont})`;

const emitAgentLog = (
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) => {
  const logger = (globalThis as { __PM_DEBUG_LOG__?: (entry: unknown) => void })
    .__PM_DEBUG_LOG__;
  if (typeof logger === 'function') {
    logger({
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    });
  }
};

const codeBlockDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();
  let lineDecorationCount = 0;
  let widgetDecorationCount = 0;
  let fencedNodeCount = 0;
  let invalidPosCount = 0;

  // #region agent log
  emitAgentLog('A', 'codeFenceExtension.ts:40', 'codeBlockDecorations enter', {
    visibleRanges: view.visibleRanges.map(({ from, to }) => ({ from, to })),
    docLength: view.state.doc.length,
  });
  // #endregion

  // If there are multiple visible ranges, it's possible to see
  // the same code block multiple times
  const visited = new Set<string>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const isFencedCode = node.name === 'FencedCode';
        const isFrontmatter = isFrontmatterNode(node);

        if (isFencedCode || isFrontmatter) {
          fencedNodeCount += 1;
          const key = JSON.stringify([node.from, node.to]);
          if (visited.has(key)) return;
          visited.add(key);

          let lang = '';
          let code = '';
          if (isFrontmatter) {
            lang = FRONTMATTER_LANGUAGE_LABEL;
            const contentNode = node.node.getChild('FrontmatterContent');
            code = contentNode
              ? view.state.doc.sliceString(contentNode.from, contentNode.to)
              : '';
          } else {
            const codeInfoNode = node.node.getChild('CodeInfo');
            if (codeInfoNode) {
              lang = view.state.doc
                .sliceString(codeInfoNode.from, codeInfoNode.to)
                .toUpperCase();
            }
            const firstLine = view.state.doc.lineAt(node.from);
            const codeStart = firstLine.to + 1;
            const codeEnd = Math.max(codeStart, node.to - 4);
            code = view.state.doc.sliceString(codeStart, codeEnd);
          }

          // #region agent log
          emitAgentLog('C', 'codeFenceExtension.ts:92', 'visiting fenced block', {
            nodeName: node.name,
            from: node.from,
            to: node.to,
            lang,
            isFrontmatter,
          });
          // #endregion

          for (let pos = node.from; pos <= node.to; ) {
            if (pos < 0 || pos > view.state.doc.length) {
              invalidPosCount += 1;
              // #region agent log
              emitAgentLog(
                'B',
                'codeFenceExtension.ts:104',
                'line iteration pos out of doc bounds',
                { pos, docLength: view.state.doc.length, nodeFrom: node.from, nodeTo: node.to },
              );
              // #endregion
              break;
            }
            const line = view.state.doc.lineAt(pos);
            const isFirstLine = pos === node.from;
            const isLastLine = line.to >= node.to;

            builder.add(
              line.from,
              line.from,
              Decoration.line({
                class: `cm-fenced-code-line ${
                  isFirstLine ? 'cm-fenced-code-line-first' : ''
                } ${isLastLine ? 'cm-fenced-code-line-last' : ''}`,
              }),
            );
            lineDecorationCount += 1;

            if (isFirstLine) {
              builder.add(
                line.from,
                line.from,
                Decoration.widget({
                  widget: new CodeBlockInfoWidget(
                    lang,
                    code,
                  ),
                }),
              );
              widgetDecorationCount += 1;
            }

            pos = line.to + 1;
          }
        }
      },
    });
  }

  // #region agent log
  emitAgentLog('B', 'codeFenceExtension.ts:154', 'codeBlockDecorations exit', {
    fencedNodeCount,
    lineDecorationCount,
    widgetDecorationCount,
    invalidPosCount,
  });
  // #endregion

  return builder.finish();
};

class CodeBlockInfoWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string,
  ) {
    super();
  }

  eq(other: CodeBlockInfoWidget) {
    return other.lang === this.lang && other.code === this.code;
  }

  toDOM() {
    const container = document.createElement('span');
    container.className = 'cm-code-block-info';
    container.setAttribute('contenteditable', 'false');

    const langContainer = document.createElement('span');
    langContainer.className = 'cm-code-block-lang-container';
    langContainer.innerText = this.lang;
    container.appendChild(langContainer);

    const copyButton = document.createElement('button');
    copyButton.className = 'cm-code-block-copy-button';
    // Copy icon from Lucide
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="lucide lucide-copy-icon lucide-copy">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>`;
    copyButton.onclick = () => {
      void navigator.clipboard.writeText(this.code);
    };
    container.appendChild(copyButton);

    return container;
  }

  ignoreEvent(_event: Event): boolean {
    return true;
  }
}

export const codeBlockDecorationsExtension: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      // #region agent log
      emitAgentLog('D', 'codeFenceExtension.ts:209', 'plugin constructor', {
        docLength: view.state.doc.length,
        visibleRanges: view.visibleRanges.map(({ from, to }) => ({ from, to })),
      });
      // #endregion
      this.decorations = codeBlockDecorations(view);
    }

    update(update: ViewUpdate) {
      const shouldRecompute = update.docChanged || update.viewportChanged;
      // #region agent log
      emitAgentLog('A', 'codeFenceExtension.ts:220', 'plugin update', {
        docChanged: update.docChanged,
        viewportChanged: update.viewportChanged,
        selectionSet: update.selectionSet,
        geometryChanged: update.geometryChanged,
        shouldRecompute,
      });
      // #endregion
      if (shouldRecompute) {
        this.decorations = codeBlockDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export const codeFenceTheme = EditorView.theme({
  '.cm-fenced-code-line': {
    display: 'block',
    marginLeft: '6px',
    backgroundColor: 'var(--pm-code-background-color)',
    fontFamily: codeFontFamily,
    fontVariantLigatures: 'none',
    fontFeatureSettings: '"calt" 0',
    fontKerning: 'none',
  },
  // In case the active line color changes
  '.cm-activeLine.cm-fenced-code-line': {
    backgroundColor: 'var(--pm-code-background-color)',
  },
  '.cm-fenced-code-line-first': {
    borderTopLeftRadius: '0.4rem',
    borderTopRightRadius: '0.4rem',
  },
  '.cm-fenced-code-line-last': {
    borderBottomLeftRadius: '0.4rem',
    borderBottomRightRadius: '0.4rem',
  },
  '.cm-code-block-info': {
    float: 'right',
    padding: '0.2rem',
    display: 'flex',
    gap: '0.3rem',
    alignItems: 'center',
  },
  '.cm-code-block-lang-container': {
    fontSize: '0.8rem',
    color: 'var(--pm-muted-color)',
  },
  '.cm-code-block-copy-button': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    padding: '0.2rem',
    borderRadius: '0.2rem',
    cursor: 'pointer',
    backgroundColor: 'var(--pm-code-btn-background-color)',
    color: 'var(--pm-muted-color)',
  },
  '.cm-code-block-copy-button:hover': {
    backgroundColor: 'var(--pm-code-btn-hover-background-color)',
  },
  '.cm-code-block-copy-button svg': {
    width: '16px',
    height: '16px',
  },
});
