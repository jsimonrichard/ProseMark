import {
  Decoration,
  type DecorationSet,
  Direction,
  EditorView,
} from '@codemirror/view';
import {
  EditorSelection,
  type EditorState,
  Facet,
  findClusterBreak,
  type Range,
  StateField,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import { type RangeLike, rangeTouchesRange, stateWORDAt } from '../utils';

const HIDDEN_TOKEN_CLASS = 'cm-hidden-token';

const hideTheme = EditorView.theme({
  [`.${HIDDEN_TOKEN_CLASS}`]: {
    fontSize: '0px',
  },
  '.cm-transparent-token': {
    opacity: 0,
  },
});

export const hideInlineDecoration = Decoration.mark({
  class: HIDDEN_TOKEN_CLASS,
});
export const hideInlineKeepSpaceDecoration = Decoration.mark({
  class: 'cm-transparent-token',
});
export const hideBlockDecoration = Decoration.replace({
  block: true,
});

const isZeroSizeHiddenDecoration = (deco: Decoration): boolean =>
  (deco.spec as { class?: string }).class === HIDDEN_TOKEN_CLASS;

/** Positive-width cluster geometry for visible hit-testing. */
export interface VisibleCharRect {
  from: number;
  to: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Map client coordinates to a document position using only positive-width
 * character rects — the same closest-horizontally / midpoint-assoc rule as
 * CodeMirror's InlineCoordsScan, but never considering width-0 clusters.
 */
export function posFromVisibleCharRects(
  coords: { x: number; y: number },
  rects: readonly VisibleCharRect[],
  ltr = true,
): number | null {
  if (rects.length === 0) return null;

  let closest: VisibleCharRect | undefined;
  let closestDx = 1e9;
  let above: VisibleCharRect | undefined;
  let below: VisibleCharRect | undefined;

  for (const rect of rects) {
    if (rect.bottom < coords.y) {
      if (!above || above.bottom < rect.bottom) above = rect;
      continue;
    }
    if (rect.top > coords.y) {
      if (!below || below.top > rect.top) below = rect;
      continue;
    }
    const off =
      rect.left > coords.x
        ? coords.x - rect.left
        : rect.right < coords.x
          ? coords.x - rect.right
          : 0;
    const dx = Math.abs(off);
    if (dx < closestDx) {
      closestDx = dx;
      closest = rect;
    }
  }

  // Parallel to InlineCoordsScan.scan when no y-overlapping rect: pick the
  // nearer vertical neighbor, move y into it, and retry (CM mutates this.y).
  if (!closest) {
    const side =
      above && (!below || coords.y - above.bottom < below.top - coords.y)
        ? above
        : below;
    if (!side) return null;
    return posFromVisibleCharRects(
      { x: coords.x, y: (side.top + side.bottom) / 2 },
      rects,
      ltr,
    );
  }

  // Same midpoint assoc as InlineCoordsScan.scan (LTR/RTL via `ltr`).
  const after = coords.x > (closest.left + closest.right) / 2 === ltr;
  return after ? closest.to : closest.from;
}

const lineHasZeroSizeHidden = (
  decorations: DecorationSet,
  from: number,
  to: number,
): boolean => {
  let found = false;
  decorations.between(from, to, (_from, _to, value) => {
    if (isZeroSizeHiddenDecoration(value)) {
      found = true;
      return false;
    }
  });
  return found;
};

const collectVisibleCharRects = (
  view: EditorView,
  lineFrom: number,
  lineTo: number,
): VisibleCharRect[] => {
  const text = view.state.doc.sliceString(lineFrom, lineTo);
  const rects: VisibleCharRect[] = [];
  for (let i = 0; i < text.length; ) {
    const next = findClusterBreak(text, i);
    const from = lineFrom + i;
    const to = lineFrom + next;
    const rect = view.coordsForChar(from);
    if (rect != null && rect.left < rect.right && rect.top < rect.bottom) {
      rects.push({
        from,
        to,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      });
    }
    i = next;
  }
  return rects;
};

/**
 * Map screen coordinates to a document position, ignoring font-size-0 hide
 * marks. CodeMirror's `posAtCoords` includes sole width-0 `getClientRects()`
 * in InlineCoordsScan, so many hidden offsets share dx=0 and the caret walks.
 * When the line has zero-size hide marks, hit-test only positive-width
 * `coordsForChar` clusters (no pixel drift threshold).
 */
export function visiblePosAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
): number | null {
  const decorations = view.state.field(hideExtension, false);
  if (!decorations) return view.posAtCoords(coords);

  const content = view.contentDOM.getBoundingClientRect();
  const yOffset = coords.y - content.top - view.documentPadding.top;
  if (yOffset < 0 || yOffset > view.contentHeight) {
    return view.posAtCoords(coords);
  }

  const block = view.lineBlockAtHeight(yOffset);
  if (!lineHasZeroSizeHidden(decorations, block.from, block.to)) {
    return view.posAtCoords(coords);
  }

  const line = view.state.doc.lineAt(block.from);
  const rects = collectVisibleCharRects(view, line.from, line.to);
  if (rects.length === 0) return null;

  const ltr = view.textDirectionAt(line.from) === Direction.LTR;
  return posFromVisibleCharRects(coords, rects, ltr);
}

const rangeForVisibleClick = (
  view: EditorView,
  pos: number,
  clickType: number,
): ReturnType<typeof EditorSelection.cursor> => {
  if (clickType >= 3) {
    const line = view.state.doc.lineAt(pos);
    return EditorSelection.range(line.from, line.to);
  }
  if (clickType === 2) {
    return stateWORDAt(view.state, pos) ?? EditorSelection.cursor(pos);
  }
  return EditorSelection.cursor(pos);
};

/**
 * Prefer visible positions for pointer selection. Uses mouseSelectionStyle
 * (not a mousedown handler that returns true) so other handlers such as
 * rendered-link clicks still run.
 */
const hideClickCorrectionExtension = EditorView.mouseSelectionStyle.of(
  (view, event) => {
    if (event.button !== 0) return null;

    const coords = { x: event.clientX, y: event.clientY };
    const naive = view.posAtCoords(coords);
    if (naive == null) return null;

    const corrected = visiblePosAtCoords(view, coords);
    if (corrected == null || corrected === naive) return null;

    let startPos = corrected;
    let startSel = view.state.selection;
    const clickType = event.detail;

    return {
      update(update) {
        if (update.docChanged) {
          startPos = update.changes.mapPos(startPos);
          startSel = startSel.map(update.changes);
        }
      },
      get(curEvent, extend, multiple) {
        const curCoords = { x: curEvent.clientX, y: curEvent.clientY };
        const cur =
          visiblePosAtCoords(view, curCoords) ??
          view.posAtCoords(curCoords) ??
          startPos;
        const range = rangeForVisibleClick(view, cur, clickType);

        if (extend) {
          return startSel.replaceRange(
            startSel.main.extend(range.from, range.to),
          );
        }
        if (multiple) return startSel.addRange(range);
        return EditorSelection.create([range]);
      },
    };
  },
);

const buildDecorations = (state: EditorState) => {
  const decorations: Range<Decoration>[] = [];
  const specs = state.facet(hidableNodeFacet);
  specs.map(checkSpec);

  syntaxTree(state).iterate({
    enter: (node) => {
      const selectionTouchesNodeRange = state.selection.ranges.some((range) =>
        rangeTouchesRange(node, range),
      );

      for (const spec of specs) {
        // Check spec
        if (spec.nodeName instanceof Function) {
          if (!spec.nodeName(node.type.name)) {
            continue;
          }
        } else if (spec.nodeName instanceof Array) {
          if (!spec.nodeName.includes(node.type.name)) {
            continue;
          }
        } else if (node.type.name !== spec.nodeName) {
          continue;
        }

        // Check custom show zone
        if (spec.unhideZone) {
          const res = spec.unhideZone(state, node);
          if (
            state.selection.ranges.some((range) =>
              rangeTouchesRange(res, range),
            )
          ) {
            continue;
          }
        }

        if (spec.nodeDecoration) {
          decorations.push(spec.nodeDecoration.range(node.from, node.to));
        }

        if (selectionTouchesNodeRange) {
          continue;
        }

        // Hide node using one of the provided methods
        if (spec.onHide) {
          const res = spec.onHide(state, node);
          if (res instanceof Array) {
            decorations.push(...res);
          } else if (res) {
            decorations.push(res);
          }
        }
        if (spec.subNodeNameToHide) {
          let names: string[];
          if (!Array.isArray(spec.subNodeNameToHide)) {
            names = [spec.subNodeNameToHide];
          } else {
            names = spec.subNodeNameToHide;
          }

          const cursor = node.node.cursor();

          // Manual traversal to ensure all children are processed
          cursor.iterate((node) => {
            if (names.includes(node.type.name)) {
              decorations.push(
                (spec.block
                  ? hideBlockDecoration
                  : spec.keepSpace
                    ? hideInlineKeepSpaceDecoration
                    : hideInlineDecoration
                ).range(node.from, node.to),
              );
            }
          });
        }
      }
    },
  });
  return Decoration.set(decorations, true);
};

export const hideExtension = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },

  update(deco, tr) {
    if (
      tr.docChanged ||
      tr.selection ||
      syntaxTree(tr.startState) !== syntaxTree(tr.state)
    ) {
      return buildDecorations(tr.state);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => [
    EditorView.decorations.from(f),
    hideTheme,
    hideClickCorrectionExtension,
  ],
});

export interface HidableNodeSpec {
  nodeName: string | string[] | ((nodeName: string) => boolean);
  nodeDecoration?: Decoration;
  subNodeNameToHide?: string | string[];
  onHide?: (
    state: EditorState,
    node: SyntaxNodeRef,
  ) => Range<Decoration> | Range<Decoration>[] | undefined;
  block?: boolean;
  keepSpace?: boolean;
  unhideZone?: (state: EditorState, node: SyntaxNodeRef) => RangeLike;
}

const checkSpec = (spec: HidableNodeSpec) => {
  if (spec.block && spec.keepSpace) {
    console.warn(
      'Only inline hide nodes can maintain space currently, but `block` and `keepSpace` are set in:',
      spec,
    );
  }
};

export const hidableNodeFacet = Facet.define<
  HidableNodeSpec,
  HidableNodeSpec[]
>({
  combine(value: readonly HidableNodeSpec[]) {
    return [...value];
  },
  enables: hideExtension,
});
