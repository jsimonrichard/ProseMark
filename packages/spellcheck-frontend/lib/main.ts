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
import { spellCheckTooltipExtension } from './tooltip';

export interface Suggestion {
  word: string;
  isPreferred?: boolean;
}

export class SpellCheckIssue extends RangeValue {
  constructor(
    public text: string,
    public suggestions?: Suggestion[],
  ) {
    super();
  }

  eq(other: SpellCheckIssue): boolean {
    return (
      this.text === other.text &&
      this.startSide === other.startSide &&
      this.endSide === other.endSide &&
      JSON.stringify(this.suggestions) === JSON.stringify(other.suggestions)
    );
  }
}

export const spellCheckIssues = Facet.define<
  RangeSet<SpellCheckIssue>,
  RangeSet<SpellCheckIssue>
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
  issues?: RangeSet<SpellCheckIssue>,
): DecorationSet {
  if (!issues) return Decoration.none;
  const builder = new RangeSetBuilder<Decoration>();
  issues.between(0, view.state.doc.length, (from, to) => {
    builder.add(from, to, underlineMark);
  });
  return builder.finish();
}

const spellCheckDecorations = ViewPlugin.fromClass(
  class SpellcheckDecorations {
    decorations;
    constructor(public view: EditorView) {
      const issues = view.state.facet(spellCheckIssues);
      this.decorations = buildDecorations(view, issues);
    }
    update(update: ViewUpdate) {
      // Rebuild decorations when doc changes or when issues are updated
      if (
        update.startState.facet(spellCheckIssues) !==
        update.state.facet(spellCheckIssues)
      ) {
        const issues = update.state.facet(spellCheckIssues);
        this.decorations = buildDecorations(update.view, issues);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const spellCheckTheme = EditorView.baseTheme({
  '.cm-spellcheck-issue': {
    textDecoration: 'underline',
    textDecorationColor: 'var(--pm-spellcheck-issue-underline-color, #037bfc)',
    backgroundColor: 'var(--pm-spellcheck-issue-background-color)',
    textDecorationStyle: 'wavy',
  },
});

export const spellCheckExtension = [
  spellCheckDecorations,
  spellCheckTheme,
  spellCheckTooltipExtension,
];

// Re-export tooltip-related exports
export {
  setTooltip,
  tooltipState,
  showSpellCheckTooltip,
  contextMenuHandler,
  spellCheckKeymap,
  closeTooltipHandlers,
  type SpellCheckAction,
  type SpellCheckActionsConfig,
  suggestionFetcher,
  spellCheckActions,
  spellCheckTooltipTheme,
  spellCheckTooltipExtension,
} from './tooltip';
