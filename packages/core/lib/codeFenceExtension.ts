import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { type Extension } from '@codemirror/state';

const codeBlockDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();

  // If there are multiple visible ranges, it's possible to see
  // the same code block multiple times
  const visited = new Set<string>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'FencedCode') {
          const key = JSON.stringify([node.from, node.to]);
          if (visited.has(key)) return;
          visited.add(key);

          for (let pos = node.from; pos <= node.to; ) {
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

            pos = line.to + 1;
          }
        }
      },
    });
  }

  return builder.finish();
};

export const codeBlockDecorationsExtension: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = codeBlockDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
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
