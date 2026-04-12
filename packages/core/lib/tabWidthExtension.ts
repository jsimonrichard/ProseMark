import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

// Issue #96 ("Text Vibrating like crazy"):
// Native tab rendering can vary enough to throw off softIndentExtension's pixel
// measurements. Wrapping each tab in a fixed-width mark keeps the rendered width
// deterministic while leaving the `\t` in the document so horizontal cursor motion
// (`moveVisually`) still visits both sides of the character — unlike
// `Decoration.replace`, which removes it from the text layout tree.

const TAB_CHARACTER = '\t';
const TAB_WIDTH_CH = 4;

const fixedTabMark = Decoration.mark({
  tagName: 'span',
  class: 'cm-fixed-tab-width',
});

const buildTabWidthDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const visitedTabPositions = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    // Scan the whole visible range directly rather than iterating line-by-line.
    // Visible ranges can overlap, so dedupe by absolute tab position.
    const visibleText = view.state.doc.sliceString(from, to);
    let tabOffset = visibleText.indexOf(TAB_CHARACTER);
    while (tabOffset !== -1) {
      const tabPos = from + tabOffset;
      if (!visitedTabPositions.has(tabPos)) {
        builder.add(tabPos, tabPos + 1, fixedTabMark);
        visitedTabPositions.add(tabPos);
      }
      tabOffset = visibleText.indexOf(TAB_CHARACTER, tabOffset + 1);
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
  '.cm-fixed-tab-width': {
    display: 'inline-block',
    // Pin line box height (see prior fix for empty inline-block baseline issues).
    verticalAlign: 'text-top',
    height: '1em',
    width: `${TAB_WIDTH_CH.toString()}ch`,
    overflow: 'hidden',
    // Hide the glyph; width comes from the box, not the engine’s tab stops.
    color: 'transparent',
    caretColor: 'currentColor',
  },
});

export const fixedTabWidthExtension: Extension = [
  fixedTabWidthDecorations,
  fixedTabWidthTheme,
];
