import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import {
  EditorSelection,
  type EditorState,
  Facet,
  type Range,
  StateField,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import { type RangeLike, rangeTouchesRange, stateWORDAt } from '../utils';

const HIDDEN_TOKEN_CLASS = 'cm-hidden-token';
/** When naive posAtCoords is farther from the click than this, re-resolve. */
const CLICK_COORD_MISMATCH_PX = 8;

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

/** True when `pos` lies inside a font-size-0 hidden token decoration. */
export function posInHiddenToken(
  decorations: DecorationSet,
  pos: number,
): boolean {
  let inside = false;
  // RangeSet.between treats end as inclusive for touching; mark content is
  // [from, to), so require pos < to.
  decorations.between(pos, pos, (from, to, value) => {
    if (isZeroSizeHiddenDecoration(value) && from <= pos && pos < to) {
      inside = true;
      return false;
    }
  });
  return inside;
}

/**
 * Map screen coordinates to a document position, preferring visible (non
 * font-size-0) characters. `font-size: 0` hide marks keep document offsets but
 * collapse visually; CodeMirror's `posAtCoords` can then snap to those marks
 * or to a distant visible character on the same line.
 */
export function visiblePosAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
): number | null {
  const naive = view.posAtCoords(coords);
  if (naive == null) return null;

  const decorations = view.state.field(hideExtension, false);
  if (!decorations) return naive;

  const naiveCoords = view.coordsAtPos(naive);
  const naiveHeight =
    naiveCoords == null ? 0 : naiveCoords.bottom - naiveCoords.top;
  const naiveDx =
    naiveCoords == null ? Infinity : Math.abs(naiveCoords.left - coords.x);
  const naiveDy =
    naiveCoords == null
      ? Infinity
      : Math.abs((naiveCoords.top + naiveCoords.bottom) / 2 - coords.y);
  const suspicious =
    posInHiddenToken(decorations, naive) ||
    naiveHeight < 1 ||
    naiveDx > CLICK_COORD_MISMATCH_PX ||
    naiveDy > CLICK_COORD_MISMATCH_PX;

  if (!suspicious) return naive;

  const line = view.state.doc.lineAt(naive);
  let best = naive;
  let bestDist = Infinity;

  for (let pos = line.from; pos <= line.to; pos++) {
    if (pos < line.to && posInHiddenToken(decorations, pos)) continue;
    const c = view.coordsAtPos(pos);
    if (c == null || c.bottom - c.top < 1) continue;
    const dx = c.left - coords.x;
    const dy = (c.top + c.bottom) / 2 - coords.y;
    const dist = dx * dx + dy * dy;
    // Zero-width hidden marks make the preceding visible pos share a screen x
    // with the next label char — prefer the later doc position on a tie.
    if (
      dist < bestDist - 0.25 ||
      (Math.abs(dist - bestDist) <= 0.25 && pos > best)
    ) {
      bestDist = dist;
      best = pos;
    }
  }

  return best;
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
