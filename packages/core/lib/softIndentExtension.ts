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
 * Document positions for one markdown “prefix” on a line (blockquote marker, list
 * marker, indentation spaces, task checkbox, etc.).
 *
 * Soft indent hangs this prefix on the first line and aligns wrapped lines with
 * {@link SoftIndentPrefixBounds.bodyStartPos body start}.
 */
export interface SoftIndentPrefixBounds {
  /** Document position where the line begins. */
  lineFrom: number;
  /** Matched prefix text at the start of the line. */
  prefix: string;
  /**
   * Last character of {@link prefix} in the document.
   *
   * Used only when the body cannot be measured at {@link bodyStartPos} (e.g. the
   * first body character sits on a replace decoration such as inline MathJax).
   */
  prefixEndPos: number;
  /**
   * First character of body content — the position immediately after {@link prefix}.
   *
   * This is the usual right edge of the hung prefix (where wrapped lines should align).
   */
  bodyStartPos: number;
}

/** Document position of the last character of a prefix with the given length. */
const prefixEndPosAt = (lineFrom: number, prefixLength: number): number =>
  lineFrom + Math.max(0, prefixLength - 1);

/** Builds {@link SoftIndentPrefixBounds} from a line start and matched prefix string. */
export const softIndentPrefixBounds = (
  lineFrom: number,
  prefix: string,
): SoftIndentPrefixBounds => ({
  lineFrom,
  prefix,
  prefixEndPos: prefixEndPosAt(lineFrom, prefix.length),
  bodyStartPos: lineFrom + prefix.length,
});

/**
 * @deprecated Prefer {@link softIndentPrefixBounds}. Returns {@link SoftIndentPrefixBounds.prefixEndPos}.
 */
export const softIndentMeasurePos = (
  lineFrom: number,
  prefixLength: number,
): number => prefixEndPosAt(lineFrom, prefixLength);

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

/** Base inset paired with {@link measureSoftIndentWidth} (blockquote border gutter). */
const SOFT_INDENT_BASE_PADDING = 6;

interface ChangedLine {
  lineNumber: number;
  lineText: string;
  oldStyle?: string;
  newStyle?: string;
}

/** DOM `.cm-line` element containing a document position, if mounted. */
const lineElementAt = (view: EditorView, pos: number): HTMLElement | null => {
  const domAt = view.domAtPos(pos);
  const node = domAt.node;
  if (node instanceof HTMLElement && node.classList.contains('cm-line')) {
    return node;
  }
  return node.parentElement?.closest('.cm-line') ?? null;
};

/** Left edge of the hung prefix (before list-mark replace widgets when present). */
const measurePrefixStartLeft = (
  view: EditorView,
  bounds: SoftIndentPrefixBounds,
): number => {
  const line = view.state.doc.lineAt(bounds.lineFrom);
  // Top-level list/task lines start with a replace widget at column 0. Measuring
  // from widget coords skips the gap between the text-indent origin (line box +
  // {@link SOFT_INDENT_BASE_PADDING}) and the bullet, so the first row body sits
  // ~0.2em right of wrapped rows.
  const prefixStartsAtLineStart =
    bounds.lineFrom === line.from && !/^[ \t>]/.test(bounds.prefix);

  if (prefixStartsAtLineStart) {
    const lineEl = lineElementAt(view, line.from);
    if (lineEl) {
      return lineEl.getBoundingClientRect().left + SOFT_INDENT_BASE_PADDING;
    }
  }

  return (
    view.coordsAtPos(bounds.lineFrom, -1)?.left ??
    view.coordsAtPos(bounds.lineFrom, 1)?.left ??
    0
  );
};

/**
 * Left edge where body text should begin — right edge of the visual prefix.
 *
 * Prefer measuring at {@link SoftIndentPrefixBounds.bodyStartPos}. When that
 * position is not a normal glyph (inline math widget, etc.), fall back to coords
 * beside {@link SoftIndentPrefixBounds.prefixEndPos}.
 */
const measureBodyStartLeft = (
  view: EditorView,
  bounds: SoftIndentPrefixBounds,
): number => {
  const { bodyStartPos, prefixEndPos, lineFrom } = bounds;
  if (prefixEndPos < lineFrom || bodyStartPos <= lineFrom) return 0;

  const bodyChar = view.coordsForChar(bodyStartPos);
  if (bodyChar) return bodyChar.left;

  const besideBody = view.coordsAtPos(bodyStartPos, 1);
  if (besideBody) return besideBody.left;

  const prefixEnd = view.coordsAtPos(prefixEndPos, 1);
  return prefixEnd?.right ?? prefixEnd?.left ?? 0;
};

/**
 * Pixel width of the soft-indent prefix. Uses document positions only so existing
 * `padding-inline-start` on the line does not compound on remeasure (click/edit).
 */
export const measureSoftIndentWidth = (
  view: EditorView,
  bounds: SoftIndentPrefixBounds,
): number => {
  const start = measurePrefixStartLeft(view, bounds);
  const end = measureBodyStartLeft(view, bounds);
  return Math.max(0, end - start);
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

    // Use view.coordsAtPos to measure the indent required
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
          const nonContent = matchSoftIndentPrefix(text);
          if (!nonContent) continue;

          const bounds = softIndentPrefixBounds(line.from, nonContent);
          const indentWidth = measureSoftIndentWidth(view, bounds);
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
        const padding = `${(indentWidth + SOFT_INDENT_BASE_PADDING).toString()}px`;
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
