import {
  EditorSelection,
  type Extension,
  Prec,
  RangeSetBuilder,
} from '@codemirror/state';
import {
  Decoration,
  Direction,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

// Issue #96 ("Text Vibrating like crazy"):
// Native tab rendering can vary enough to throw off softIndentExtension's pixel
// measurements. Replacing each visible tab with a fixed-width widget keeps
// indentation width deterministic and prevents jitter.

const TAB_CHARACTER = '\t';
const TAB_WIDTH_CH = 4;

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
  const visitedTabPositions = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    // Scan the whole visible range directly rather than iterating line-by-line.
    // Visible ranges can overlap, so dedupe by absolute tab position.
    const visibleText = view.state.doc.sliceString(from, to);
    let tabOffset = visibleText.indexOf(TAB_CHARACTER);
    while (tabOffset !== -1) {
      const tabPos = from + tabOffset;
      if (!visitedTabPositions.has(tabPos)) {
        builder.add(tabPos, tabPos + 1, fixedTabDecoration);
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
  '.cm-fixed-tab-width-widget': {
    display: 'inline-block',
    // Empty inline-blocks baseline-align to their bottom edge, which inflates
    // the line box and makes coordsAtPos (thus drawSelection's cursor) taller
    // when the caret sits immediately after the tab. Match CodeMirror's own
    // `.cm-widgetBuffer` approach: pin height and align to the text box.
    verticalAlign: 'text-top',
    height: '1em',
    width: `${TAB_WIDTH_CH.toString()}ch`,
    pointerEvents: 'none',
  },
});

/** Same “logical forward” sense as defaultKeymap ArrowRight / Shift-ArrowRight. */
function logicalForwardAt(view: EditorView, head: number): boolean {
  return view.textDirectionAt(head) === Direction.LTR;
}

function adjustSelectionForTabMotion(
  view: EditorView,
  forward: boolean,
): EditorSelection | null {
  const { doc, selection } = view.state;
  const ranges = selection.ranges.map((range) => {
    const { anchor, head } = range;
    const ahead = forward === logicalForwardAt(view, head);

    if (range.empty) {
      if (ahead && head < doc.length && doc.sliceString(head, head + 1) === TAB_CHARACTER) {
        return EditorSelection.cursor(head + 1, -1);
      }
      if (!ahead && head > 0 && doc.sliceString(head - 1, head) === TAB_CHARACTER) {
        return EditorSelection.cursor(head - 1, 1);
      }
      return range;
    }

    const goal = range.goalColumn;
    const bidi = range.bidiLevel ?? undefined;

    if (ahead && head < doc.length && doc.sliceString(head, head + 1) === TAB_CHARACTER) {
      return EditorSelection.range(anchor, head + 1, goal, bidi, -1);
    }
    if (!ahead && head > 0 && doc.sliceString(head - 1, head) === TAB_CHARACTER) {
      return EditorSelection.range(anchor, head - 1, goal, bidi, 1);
    }
    return range;
  });

  const unchanged = ranges.every((r, i) => {
    const prev = selection.ranges[i];
    return prev !== undefined && r.eq(prev, true);
  });
  if (unchanged) return null;
  return EditorSelection.create(ranges, selection.mainIndex);
}

function tabArrowRight(view: EditorView): boolean {
  const sel = adjustSelectionForTabMotion(view, true);
  if (!sel) return false;
  view.dispatch({ selection: sel, scrollIntoView: true, userEvent: 'select' });
  return true;
}

function tabArrowLeft(view: EditorView): boolean {
  const sel = adjustSelectionForTabMotion(view, false);
  if (!sel) return false;
  view.dispatch({ selection: sel, scrollIntoView: true, userEvent: 'select' });
  return true;
}

/** Runs before defaultKeymap so we can cross tab columns moveVisually would skip. */
const fixedTabArrowKeymap = Prec.high(
  keymap.of([
    { key: 'ArrowRight', run: tabArrowRight, shift: tabArrowRight },
    { key: 'ArrowLeft', run: tabArrowLeft, shift: tabArrowLeft },
  ]),
);

export const fixedTabWidthExtension: Extension = [
  fixedTabWidthDecorations,
  fixedTabWidthTheme,
  fixedTabArrowKeymap,
];
