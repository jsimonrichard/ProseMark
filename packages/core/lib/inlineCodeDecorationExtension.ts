import {
  type EditorState,
  type Extension,
  Prec,
  RangeSetBuilder,
  StateField,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

const inlineCodeDecoration = Decoration.mark({
  class: 'cm-inline-code',
});

const buildDecorations = (state: EditorState): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'InlineCode') return;

      const startMark = node.node.firstChild;
      const endMark = node.node.lastChild;

      if (
        !startMark ||
        !endMark ||
        startMark.type.name !== 'CodeMark' ||
        endMark.type.name !== 'CodeMark'
      ) {
        return;
      }

      const from = startMark.to;
      const to = endMark.from;
      if (from >= to) return;
      builder.add(from, to, inlineCodeDecoration);
    },
  });

  return builder.finish();
};

const inlineCodeDecorationsField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged) {
      return buildDecorations(tr.state);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const inlineCodeDecorationExtension: Extension = Prec.low(
  inlineCodeDecorationsField,
);
