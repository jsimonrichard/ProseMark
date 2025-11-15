import { Annotation, Line, RangeSet, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';

interface IndentData {
  line: Line;
  indentWidth: number;
}

const softIndentPattern = /^(> )*(\s*)?(([-*+]?|\d[.)])\s)?(\[.\]\s)?/;

const softIndentRefresh = Annotation.define<boolean>();

export const softIndentExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.requestMeasure(view);
    }

    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        this.requestMeasure(u.view);
      }

      if (u.transactions.some((tr) => tr.annotation(softIndentRefresh))) {
        this.requestMeasure(u.view);
      }
    }

    requestMeasure(view: EditorView) {
      // Needs to run via requestMeasure since it measures and updates the DOM
      view.requestMeasure({
        read: (view) => this.measureIndents(view),
        write: (indents, view) => {
          this.applyIndents(indents, view);
        },
      });
    }

    // Use view.coordAtPos to measure the indent required
    measureIndents(view: EditorView) {
      const indents: IndentData[] = [];
      // Loop through all visible lines
      for (const { from, to } of view.visibleRanges) {
        const start = view.state.doc.lineAt(from);
        const end = view.state.doc.lineAt(to);
        for (let i = start.number; i <= end.number; i++) {
          // Get current line object
          const line = view.state.doc.line(i);

          // Match the line's text with the indent pattern
          const text = view.state.sliceDoc(line.from, line.to);
          const matches = softIndentPattern.exec(text);
          if (!matches) continue;
          const nonContent = matches[0];

          // Get indent width
          const indentWidth =
            (view.coordsAtPos(line.from + nonContent.length)?.left ?? 0) -
            (view.coordsAtPos(line.from)?.left ?? 0);
          if (!indentWidth) continue;

          indents.push({
            line,
            indentWidth,
          });
        }
      }
      return indents;
    }

    buildDecorations(indents: IndentData[]) {
      const builder = new RangeSetBuilder<Decoration>();

      for (const { line, indentWidth } of indents) {
        const deco = Decoration.line({
          attributes: {
            style: `padding-inline-start: ${(indentWidth + 6).toString()}px; text-indent: -${indentWidth.toString()}px;`,
          },
        });

        builder.add(line.from, line.from, deco);
      }

      return builder.finish();
    }

    // This applies new decorations and will dispatch another transaction
    // until the dom layout settles
    applyIndents(indents: IndentData[], view: EditorView) {
      const newDecos = this.buildDecorations(indents);
      let changed = false;
      for (const { from, to } of view.visibleRanges) {
        if (!RangeSet.eq([this.decorations], [newDecos], from, to)) {
          changed = true;
          break;
        }
      }
      if (changed) {
        queueMicrotask(() => {
          view.dispatch({ annotations: [softIndentRefresh.of(true)] });
        });
      }
      this.decorations = newDecos;
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
