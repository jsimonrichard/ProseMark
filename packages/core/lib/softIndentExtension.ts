import { Annotation, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isInlineMathNode } from './markdown/mathMarkdown';

interface IndentData {
  lineNumber: number;
  indentWidth: number;
  /** Skip negative `text-indent` — it breaks inline replace widgets (e.g. MathJax). */
  paddingOnly: boolean;
}

const softIndentPattern = /^(> )*(\s*)?(([-*+]?|\d[.)])\s)?(\[.\]\s)?/;

const SOFT_INDENT_LINE_CLASS = 'cm-soft-indent-line';
const SOFT_INDENT_INLINE_MATH_CLASS = 'cm-soft-indent-line--inline-math';

/**
 * Document position to measure the visual end of a soft-indent prefix.
 * Uses the last source character of the prefix (not the position after it) so
 * `coordsAtPos` does not land on replace decorations (e.g. inline MathJax at
 * `- $...$`).
 */
export const softIndentMeasurePos = (
  lineFrom: number,
  nonContentLength: number,
): number => lineFrom + Math.max(0, nonContentLength - 1);

const softIndentRefresh = Annotation.define<number>();
const MAX_REFRESH_ROUNDS = 1;

interface ChangedLine {
  lineNumber: number;
  lineText: string;
  oldStyle?: string;
  newStyle?: string;
}

const lineElementAt = (
  view: EditorView,
  lineFrom: number,
): HTMLElement | null => {
  const dom = view.domAtPos(lineFrom);
  const node = dom.node;
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest('.cm-line') ?? null;
};

const lineHasInlineMath = (
  view: EditorView,
  lineFrom: number,
  lineTo: number,
) => {
  let found = false;
  syntaxTree(view.state).iterate({
    from: lineFrom,
    to: lineTo,
    enter: (node) => {
      if (node.name !== 'Math') return;
      if (isInlineMathNode(view.state, node.from, node.to)) {
        found = true;
        return false;
      }
    },
  });
  return found;
};

/**
 * Measure prefix width from the line box's left edge to the end of the markdown
 * prefix. Uses the line DOM edge instead of `coordsAtPos(line.from)` so list-mark
 * replace widgets and inline math on the same line cannot skew the width.
 */
export const measureSoftIndentWidth = (
  view: EditorView,
  lineFrom: number,
  measurePos: number,
): number => {
  const lineLeft = lineElementAt(view, lineFrom)?.getBoundingClientRect().left;
  const endCoords = view.coordsAtPos(measurePos, 1);
  const endRight = endCoords?.right ?? endCoords?.left;
  if (lineLeft === undefined || endRight === undefined) return 0;
  return Math.max(0, endRight - lineLeft);
};

function getDifferences(
  view: EditorView,
  oldStyles: Map<number, string>,
  newStyles: Map<number, string>,
): ChangedLine[] {
  const changedLines: ChangedLine[] = [];

  // Compare decorations line by line
  for (const { from, to } of view.visibleRanges) {
    const start = view.state.doc.lineAt(from);
    const end = view.state.doc.lineAt(to);
    for (let i = start.number; i <= end.number; i++) {
      const line = view.state.doc.line(i);
      const oldStyle = oldStyles.get(i);
      const newStyle = newStyles.get(i);

      if (oldStyle !== newStyle) {
        const lineText = view.state.sliceDoc(line.from, line.to);
        changedLines.push({
          lineNumber: i,
          lineText,
          ...(oldStyle !== undefined && { oldStyle }),
          ...(newStyle !== undefined && { newStyle }),
        });
      }
    }
  }

  return changedLines;
}

export const softIndentExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    lineStyles = new Map<number, string>();

    constructor(view: EditorView) {
      this.requestMeasure(view);
    }

    update(u: ViewUpdate) {
      if (u.docChanged) {
        this.decorations = this.decorations.map(u.changes);
      }

      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        this.requestMeasure(u.view, 0);
      }

      const refreshCount = u.transactions
        .find((tr) => tr.annotation(softIndentRefresh) !== undefined)
        ?.annotation(softIndentRefresh);
      if (refreshCount !== undefined) {
        this.requestMeasure(u.view, refreshCount);
      }
    }

    requestMeasure(view: EditorView, refreshCount = 0) {
      // Needs to run via requestMeasure since it measures and updates the DOM
      view.requestMeasure({
        read: (view) => this.measureIndents(view),
        write: (indents, view) => {
          this.applyIndents(indents, view, refreshCount);
        },
      });
    }

    // Use view.coordAtPos to measure the indent required
    measureIndents(view: EditorView): IndentData[] {
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

          const measurePos = softIndentMeasurePos(line.from, nonContent.length);
          const indentWidth = measureSoftIndentWidth(
            view,
            line.from,
            measurePos,
          );
          if (!indentWidth) continue;

          const paddingOnly = lineHasInlineMath(view, line.from, line.to);

          indents.push({
            lineNumber: i,
            indentWidth,
            paddingOnly,
          });
        }
      }
      return indents;
    }

    buildDecorations(indents: IndentData[], view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const styles = new Map<number, string>();

      for (const { lineNumber, indentWidth, paddingOnly } of indents) {
        const line = view.state.doc.line(lineNumber);
        const padding = `${(indentWidth + 6).toString()}px`;
        const style = paddingOnly
          ? `padding-inline-start: ${padding};`
          : `padding-inline-start: ${padding}; text-indent: -${indentWidth.toString()}px;`;
        styles.set(lineNumber, style);

        const className = paddingOnly
          ? `${SOFT_INDENT_LINE_CLASS} ${SOFT_INDENT_INLINE_MATH_CLASS}`
          : SOFT_INDENT_LINE_CLASS;

        const deco = Decoration.line({
          attributes: {
            class: className,
            style,
          },
        });

        builder.add(line.from, line.from, deco);
      }

      return { decorations: builder.finish(), styles };
    }

    // This applies new decorations and will dispatch another transaction
    // until the dom layout settles
    applyIndents(indents: IndentData[], view: EditorView, refreshCount = 0) {
      const { decorations: newDecos, styles: newStyles } =
        this.buildDecorations(indents, view);
      const changedLines = getDifferences(view, this.lineStyles, newStyles);

      if (changedLines.length > 0) {
        if (refreshCount < MAX_REFRESH_ROUNDS) {
          queueMicrotask(() => {
            view.dispatch({
              annotations: [softIndentRefresh.of(refreshCount + 1)],
            });
          });
        } else {
          const roundNumber = String(refreshCount);
          console.warn(
            `Soft indent: indents still changing after ${roundNumber} refresh rounds. Affected lines:`,
            changedLines,
          );
        }
      }
      this.decorations = newDecos;
      this.lineStyles = newStyles;
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
