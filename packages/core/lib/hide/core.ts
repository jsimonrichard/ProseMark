import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import {
  type EditorState,
  Facet,
  type Range,
  StateField,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import { type RangeLike, rangeTouchesRange } from '../utils';

const hideTheme = EditorView.theme({
  '.cm-hidden-token': {
    fontSize: '0px',
  },
});

export const hideInlineDecoration = Decoration.mark({
  class: 'cm-hidden-token',
});
export const hideBlockDecoration = Decoration.replace({
  block: true,
});

const buildDecorations = (state: EditorState) => {
  const decorations: Range<Decoration>[] = [];
  const specs = state.facet(hidableNodeFacet);
  syntaxTree(state).iterate({
    enter: (node) => {
      // If the selection overlaps with the node, don't hide it
      if (
        state.selection.ranges.some((range) => rangeTouchesRange(node, range))
      ) {
        return;
      }

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
            return;
          }
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
          console.assert(cursor.firstChild(), 'A hide node must have children');

          // Manual traversal to ensure all children are processed
          do {
            if (names.includes(cursor.type.name)) {
              decorations.push(
                (spec.block ? hideBlockDecoration : hideInlineDecoration).range(
                  cursor.from,
                  cursor.to,
                ),
              );
            }
          } while (cursor.nextSibling());
        }
      }
    },
  });
  return Decoration.set(decorations, true);
};

const hideExtension = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },

  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => [EditorView.decorations.from(f), hideTheme],
});

export interface HidableNodeSpec {
  nodeName: string | string[] | ((nodeName: string) => boolean);
  subNodeNameToHide?: string | string[];
  onHide?: (
    state: EditorState,
    node: SyntaxNodeRef,
  ) => Range<Decoration> | Range<Decoration>[] | undefined;
  block?: boolean;
  unhideZone?: (state: EditorState, node: SyntaxNodeRef) => RangeLike;
}

export const hidableNodeFacet = Facet.define<
  HidableNodeSpec,
  HidableNodeSpec[]
>({
  combine(value: readonly HidableNodeSpec[]) {
    return [...value];
  },
  enables: hideExtension,
});
