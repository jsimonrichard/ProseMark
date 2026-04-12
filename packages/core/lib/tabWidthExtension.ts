import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type Rect,
  type ViewUpdate,
} from '@codemirror/view';

// Issue #96 ("Text Vibrating like crazy"):
// Native tab rendering can vary enough to throw off softIndentExtension's pixel
// measurements. Replacing each tab with a fixed-width span keeps width
// deterministic. The span still contains a real `\t` so `moveVisually` visits
// both sides of the character (unlike an empty widget). We override `coordsAt`
// so caret coordinates use the box edges — wrapping + `overflow: hidden` would
// otherwise clip the tab glyph’s rects and make `coordsAtPos` return an empty
// range (disappearing drawSelection caret).

const TAB_CHARACTER = '\t';
const TAB_WIDTH_CH = 4;

function tabWidthPx(view: EditorView): string {
  const scaleX = view.scaleX || 1;
  const px = (TAB_WIDTH_CH * view.defaultCharacterWidth) / scaleX;
  return `${String(px)}px`;
}

class FixedTabWidthWidget extends WidgetType {
  eq(other: FixedTabWidthWidget): boolean {
    return other instanceof FixedTabWidthWidget;
  }

  toDOM(view: EditorView): HTMLElement {
    const element = document.createElement('span');
    element.className = 'cm-fixed-tab-width-widget';
    element.textContent = TAB_CHARACTER;
    element.style.width = tabWidthPx(view);
    return element;
  }

  updateDOM(dom: HTMLElement, view: EditorView, _prev: this): boolean {
    dom.style.width = tabWidthPx(view);
    return true;
  }

  coordsAt(dom: HTMLElement, pos: number, _side: number): Rect | null {
    const rect = dom.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    // Match WidgetTile.coordsInWidget(..., block: true): offset 0 → left edge,
    // offset 1 → right edge. Do not use `side` here — it is not the same as
    // document assoc and misplaces drawSelection when it disagrees with `pos`.
    const x = pos === 0 ? rect.left : rect.right;
    const top = rect.top;
    let bottom = rect.bottom;
    const parent = dom.parentElement;
    if (parent) {
      const lh = parseInt(window.getComputedStyle(parent).lineHeight, 10);
      if (!Number.isNaN(lh) && bottom - top > lh * 1.5) {
        bottom = top + lh;
      }
    }
    return { left: x, right: x, top, bottom };
  }
}

const fixedTabDecoration = Decoration.replace({
  widget: new FixedTabWidthWidget(),
});

const buildTabWidthDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const visitedTabPositions = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
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
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.geometryChanged
      ) {
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
    verticalAlign: 'text-top',
    height: '1em',
    overflow: 'hidden',
    color: 'transparent',
    caretColor: 'currentColor',
    pointerEvents: 'none',
  },
});

export const fixedTabWidthExtension: Extension = [
  fixedTabWidthDecorations,
  fixedTabWidthTheme,
];
