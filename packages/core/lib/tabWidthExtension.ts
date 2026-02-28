import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

class FixedTabWidthWidget extends WidgetType {
  eq(other: FixedTabWidthWidget): boolean {
    return other instanceof FixedTabWidthWidget;
  }

  toDOM(): HTMLElement {
    const element = document.createElement('span');
    element.className = 'cm-fixed-tab-width-widget';
    element.setAttribute('aria-hidden', 'true');
    return element;
  }
}

const fixedTabDecoration = Decoration.replace({
  widget: new FixedTabWidthWidget(),
});

const buildTabWidthDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const visitedLines = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    const firstLine = view.state.doc.lineAt(from).number;
    const lastLine = view.state.doc.lineAt(to).number;

    for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
      if (visitedLines.has(lineNumber)) {
        continue;
      }
      visitedLines.add(lineNumber);

      const line = view.state.doc.line(lineNumber);
      const text = view.state.doc.sliceString(line.from, line.to);

      let tabOffset = text.indexOf('\t');
      while (tabOffset !== -1) {
        builder.add(
          line.from + tabOffset,
          line.from + tabOffset + 1,
          fixedTabDecoration,
        );
        tabOffset = text.indexOf('\t', tabOffset + 1);
      }
    }
  }

  return builder.finish();
};

const fixedTabWidthDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildTabWidthDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildTabWidthDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
  },
);

const fixedTabWidthTheme = EditorView.baseTheme({
  '.cm-fixed-tab-width-widget': {
    display: 'inline-block',
    width: '4ch',
    pointerEvents: 'none',
  },
});

export const fixedTabWidthExtension: Extension = [
  fixedTabWidthDecorations,
  fixedTabWidthTheme,
];
