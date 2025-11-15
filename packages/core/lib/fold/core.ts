import {
  type EditorState,
  StateField,
  type Range,
  Facet,
  EditorSelection,
  type Extension,
} from '@codemirror/state';
import {
  type DOMEventHandlers,
  Decoration,
  type DecorationSet,
  EditorView,
} from '@codemirror/view';
import {
  eventHandlersWithClass,
  type RangeLike,
  selectionTouchesRange,
} from '../utils';

import type { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';

const buildDecorations = (state: EditorState) => {
  const decorations: Range<Decoration>[] = [];
  const specs = state.facet(foldableSyntaxFacet);
  syntaxTree(state).iterate({
    enter: (node) => {
      if (selectionTouchesRange(state.selection.ranges, node)) return;

      // Generate Path
      const lineage = [];
      let node_: SyntaxNodeRef | null = node;
      while (node_) {
        lineage.push(node_.name);
        node_ = node_.node.parent;
      }
      const path = lineage.reverse().join('/');

      for (const spec of specs) {
        // Check node path
        if (spec.nodePath instanceof Function) {
          if (!spec.nodePath(path)) {
            continue;
          }
        } else if (spec.nodePath instanceof Array) {
          if (!spec.nodePath.some((testPath) => path.endsWith(testPath))) {
            continue;
          }
        } else if (!path.endsWith(spec.nodePath)) {
          continue;
        }

        // Check custom unfold zone
        if (spec.unfoldZone) {
          if (
            selectionTouchesRange(
              state.selection.ranges,
              spec.unfoldZone(state, node),
            )
          ) {
            return;
          }
        }

        // Run folding logic
        if (spec.onFold) {
          const res = spec.onFold(state, node);
          if (res instanceof Array) {
            decorations.push(...res);
          } else if (res) {
            decorations.push(res);
          }
        }
      }
    },
  });
  return Decoration.set(decorations, true);
};

export const foldDecorationExtension = StateField.define<DecorationSet>({
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

export const foldExtension = [foldDecorationExtension];

export interface FoldableSyntaxSpec {
  nodePath: string | string[] | ((nodePath: string) => boolean);
  onFold?: (
    state: EditorState,
    node: SyntaxNodeRef,
  ) => Range<Decoration> | Range<Decoration>[] | undefined;
  unfoldZone?: (state: EditorState, node: SyntaxNodeRef) => RangeLike;
  eventHandlers?: DOMEventHandlers<void>;
}

export const foldableSyntaxFacet = Facet.define<
  FoldableSyntaxSpec,
  FoldableSyntaxSpec[]
>({
  combine(value: readonly FoldableSyntaxSpec[]) {
    return [...value];
  },
  enables: foldExtension,
});

export const selectAllDecorationsOnSelectExtension = (
  widgetClass: string,
): Extension =>
  EditorView.domEventHandlers(
    eventHandlersWithClass({
      mousedown: {
        [widgetClass]: (e: MouseEvent, view: EditorView) => {
          // Change selection when appropriate so that the content can be edited
          // (selection by mouse would overshoot the widget content range)

          const ranges = view.state.selection.ranges;
          if (ranges.length === 0 || ranges[0]?.anchor !== ranges[0]?.head)
            return;

          const target = e.target as HTMLElement;
          const pos = view.posAtDOM(target);

          const decorations = view.state.field(foldDecorationExtension);
          decorations.between(pos, pos, (from: number, to: number) => {
            setTimeout(() => {
              view.dispatch({
                selection: EditorSelection.single(to, from),
              });
            }, 0);
            return false;
          });
        },
      },
    }),
  );
