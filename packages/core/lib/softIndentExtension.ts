import { Annotation, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';

interface IndentData {
  lineNumber: number;
  indentWidth: number;
}

const softIndentPattern = /^(> )*(\s*)?(([-*+]?|\d[.)])\s)?(\[.\]\s)?/;

/** Class on lines that use soft hanging-indent layout (used by `@prosemark/latex` theme). */
export const SOFT_INDENT_LINE_CLASS = 'cm-soft-indent-line';

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

/**
 * Returns the markdown prefix to hang (blockquote, leading space/tab, list, task),
 * or `null` when the line should not get soft indent (e.g. plain paragraphs).
 */
export const matchSoftIndentPrefix = (lineText: string): string | null => {
  const matches = softIndentPattern.exec(lineText);
  if (!matches) return null;
  const nonContent = matches[0];
  if (!nonContent.length) return null;
  if (nonContent.startsWith('>')) return nonContent;
  if (/^[ \t]/.test(nonContent)) return nonContent;
  if (/^(\s*)([-*+]|\d[.)])\s/.test(lineText)) return nonContent;
  if (/^(\s*)([-*+]|\d[.)])\s\[.\]\s/.test(lineText)) return nonContent;
  return null;
};

const softIndentRefresh = Annotation.define<number>();
const MAX_REFRESH_ROUNDS = 1;

interface ChangedLine {
  lineNumber: number;
  lineText: string;
  oldStyle?: string;
  newStyle?: string;
}

/**
 * Pixel width of the soft-indent prefix. Uses document positions only so existing
 * `padding-inline-start` on the line does not compound on remeasure (click/edit).
 */
export const measureSoftIndentWidth = (
  view: EditorView,
  lineFrom: number,
  measurePos: number,
): number => {
  if (measurePos < lineFrom) return 0;

  const endCoords = view.coordsAtPos(measurePos, 1);
  const end = endCoords?.right ?? endCoords?.left ?? 0;

  // List marks are replace widgets at `lineFrom`; use the right edge of that cell.
  const startAfterMark = view.coordsAtPos(lineFrom, 1);
  const startBeforeMark = view.coordsAtPos(lineFrom, -1);
  const candidates = [startAfterMark?.left, startBeforeMark?.left].filter(
    (v): v is number => v !== undefined,
  );

  if (!candidates.length) return 0;
  const start = Math.min(...candidates);
  return Math.max(0, end - start);
};

function getDifferences(
  view: EditorView,
  oldStyles: Map<number, string>,
  newStyles: Map<number, string>,
): ChangedLine[] {
  const changedLines: ChangedLine[] = [];

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
      view.requestMeasure({
        read: (view) => this.measureIndents(view),
        write: (indents, view) => {
          this.applyIndents(indents, view, refreshCount);
        },
      });
    }

    measureIndents(view: EditorView): IndentData[] {
      const indents: IndentData[] = [];
      for (const { from, to } of view.visibleRanges) {
        const start = view.state.doc.lineAt(from);
        const end = view.state.doc.lineAt(to);
        for (let i = start.number; i <= end.number; i++) {
          const line = view.state.doc.line(i);
          const text = view.state.sliceDoc(line.from, line.to);
          const nonContent = matchSoftIndentPrefix(text);
          if (!nonContent) continue;

          const measurePos = softIndentMeasurePos(line.from, nonContent.length);
          const indentWidth = measureSoftIndentWidth(
            view,
            line.from,
            measurePos,
          );
          if (!indentWidth) continue;

          indents.push({
            lineNumber: i,
            indentWidth,
          });
        }
      }
      return indents;
    }

    buildDecorations(indents: IndentData[], view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const styles = new Map<number, string>();

      for (const { lineNumber, indentWidth } of indents) {
        const line = view.state.doc.line(lineNumber);
        const padding = `${(indentWidth + 6).toString()}px`;
        const style = `padding-inline-start: ${padding}; text-indent: -${indentWidth.toString()}px;`;
        styles.set(lineNumber, style);

        const deco = Decoration.line({
          attributes: {
            class: SOFT_INDENT_LINE_CLASS,
            style,
          },
        });

        builder.add(line.from, line.from, deco);
      }

      return { decorations: builder.finish(), styles };
    }

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
