import { syntaxTree } from '@codemirror/language';
import {
  EditorState,
  RangeSet,
  StateField,
  type Range,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';

class NestedBlockQuoteBorder extends WidgetType {
  charOffset: number;

  constructor(charOffset: number) {
    super();
    this.charOffset = charOffset;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-nested-blockquote-border';
    span.style = `--blockquote-border-offset: ${this.charOffset.toString()}ch`;
    return span;
  }

  ignoreEvent(_event: Event) {
    return false;
  }
}

const buildDecorations = (state: EditorState) => {
  const decos: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.type.name != 'Blockquote') {
        return;
      }

      const startLine = state.doc.lineAt(node.from).number;
      const endLine = state.doc.lineAt(node.to).number;
      console.log('going from', startLine, endLine);
      for (let i = startLine; i <= endLine; i++) {
        const line = state.doc.line(i);
        console.log('adding quote line', line.from);
        decos.push(
          Decoration.line({
            attributes: {
              class: 'cm-blockquote-line',
            },
          }).range(line.from),
        );
      }

      // Find any nested blockquotes
      const cursor = node.node.cursor();
      cursor.iterate((node) => {
        if (node.type.name !== 'QuoteMark') {
          return;
        }
        const line = state.doc.lineAt(node.from);
        if (node.from == line.from) {
          return;
        }
        console.log('adding quotemark', node.from);
        decos.push(
          Decoration.widget({
            widget: new NestedBlockQuoteBorder(node.from - line.from),
          }).range(node.from),
        );
      });

      return false;
    },
  });

  return RangeSet.of(decos, true);
};

export const blockQuoteExtension = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },

  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => [EditorView.decorations.from(f)],
});
