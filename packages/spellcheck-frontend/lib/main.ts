import {
  RangeSet,
  RangeValue,
  RangeSetBuilder,
  Facet,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
// Import tooltip-related exports
import { spellcheckTooltipExtension } from './tooltip';

export interface Suggestion {
  word: string;
  isPreferred?: boolean;
}

export class SpellcheckIssue extends RangeValue {
  constructor(
    public text: string,
    public suggestions?: Suggestion[],
  ) {
    super();
  }

  eq(other: SpellcheckIssue): boolean {
    return (
      this.text === other.text &&
      this.startSide === other.startSide &&
      this.endSide === other.endSide &&
      JSON.stringify(this.suggestions) === JSON.stringify(other.suggestions)
    );
  }
}

export const spellcheckIssues = Facet.define<
  RangeSet<SpellcheckIssue>,
  RangeSet<SpellcheckIssue>
>({
  combine(issues) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return issues.length > 0 ? issues[issues.length - 1]! : RangeSet.of([]);
  },
});

// Decoration to apply to misspelled ranges
const underlineMark = Decoration.mark({ class: 'cm-spellcheck-issue' });

function buildDecorations(
  view: EditorView,
  issues?: RangeSet<SpellcheckIssue>,
): DecorationSet {
  if (!issues) return Decoration.none;
  const builder = new RangeSetBuilder<Decoration>();
  issues.between(0, view.state.doc.length, (from, to) => {
    builder.add(from, to, underlineMark);
  });
  return builder.finish();
}

const spellcheckDecorations = ViewPlugin.fromClass(
  class SpellcheckDecorations {
    decorations: DecorationSet;
    constructor(public view: EditorView) {
      const issues = view.state.facet(spellcheckIssues);
      this.decorations = buildDecorations(view, issues);
    }
    update(update: ViewUpdate) {
      const issuesChanged =
        update.startState.facet(spellcheckIssues) !==
        update.state.facet(spellcheckIssues);

      // Keep existing decorations in sync with document edits.
      // Without this mapping step, stale ranges can become invalid and break
      // the editor view when follow-up (non-doc) transactions run.
      if (update.docChanged && !issuesChanged) {
        this.decorations = this.decorations.map(update.changes);
      }

      // Rebuild when spellcheck issues are updated.
      if (issuesChanged) {
        const issues = update.state.facet(spellcheckIssues);
        this.decorations = buildDecorations(update.view, issues);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const spellcheckTheme = EditorView.baseTheme({
  '.cm-spellcheck-issue': {
    textDecoration: 'underline',
    textDecorationColor: 'var(--pm-spellcheck-issue-underline-color, #037bfc)',
    backgroundColor: 'var(--pm-spellcheck-issue-background-color)',
    textDecorationStyle: 'wavy',
  },
});

export const spellcheckExtension = [
  spellcheckDecorations,
  spellcheckTheme,
  spellcheckTooltipExtension,
];

// Re-export tooltip-related exports
export {
  setTooltip,
  tooltipState,
  showSpellcheckTooltip,
  contextMenuHandler,
  spellcheckKeymap,
  closeTooltipHandlers,
  type SpellcheckAction,
  type SpellcheckActionsConfig,
  suggestionFetcher,
  spellcheckActions,
  spellcheckTooltipTheme,
  spellcheckTooltipExtension,
} from './tooltip';
