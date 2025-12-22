import {
  Range,
  RangeSet,
  RangeValue,
  StateEffect,
  StateField,
  Transaction,
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
import {
  tooltipState,
  contextMenuHandler,
  spellCheckKeymap,
  closeTooltipHandlers,
} from './tooltip';

export interface Suggestion {
  word: string;
  isPreferred?: boolean;
}

export interface SpellCheckAction {
  label: string;
  execute: (word: string, view: EditorView) => void | Promise<void>;
}

export interface SpellCheckActionsConfig {
  actions: SpellCheckAction[];
}

// Facet for providing a callback to fetch suggestions asynchronously
export const suggestionFetcher =
  Facet.define<(word: string) => Promise<Suggestion[]>>();

// Facet for providing extra actions to show in the tooltip
export const spellCheckActions = Facet.define<
  (word: string) => SpellCheckActionsConfig,
  (word: string) => SpellCheckActionsConfig
>({
  combine(configs) {
    return (word: string): SpellCheckActionsConfig => {
      const allActions: SpellCheckAction[] = [];
      for (const provider of configs) {
        const config = provider(word);
        allActions.push(...config.actions);
      }
      return { actions: allActions };
    };
  },
});

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

interface SpellCheckEffect {
  issues: Range<SpellCheckIssue>[];
}

interface SpellCheckState {
  skipped?: boolean;
  issues?: RangeSet<SpellCheckIssue>;
}

export const spellCheckEffect = StateEffect.define<SpellCheckEffect>();
export const spellCheckState = StateField.define<SpellCheckState>({
  create(): SpellCheckState {
    return {
      issues: RangeSet.of([]),
    };
  },

  update(value: SpellCheckState, tr: Transaction): SpellCheckState {
    let issues = value.issues ?? RangeSet.of<SpellCheckIssue>([]);

    // Keep existing issues positioned as the document changes until a new set is provided
    if (tr.docChanged) {
      issues = issues.map(tr.changes);
    }

    for (const e of tr.effects) {
      if (e.is(spellCheckEffect)) {
        issues = RangeSet.of(e.value.issues);
      }
    }

    return { issues };
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
      const state = view.state.field(spellCheckState);
      this.decorations = buildDecorations(view, state.issues);
    }
    update(update: ViewUpdate) {
      // Rebuild decorations when doc changes or when issues are updated
      if (
        update.docChanged ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(spellCheckEffect)),
        )
      ) {
        const state = update.state.field(spellCheckState);
        this.decorations = buildDecorations(update.view, state.issues);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// Helper function to find spellcheck issue at a given position
export function findIssueAtPos(
  view: EditorView,
  pos: number,
): { issue: SpellCheckIssue; from: number; to: number } | null {
  const state = view.state.field(spellCheckState);
  const issues = state.issues;
  if (!issues) return null;

  let found: { issue: SpellCheckIssue; from: number; to: number } | null = null;
  issues.between(0, view.state.doc.length, (from, to, issue) => {
    if (pos >= from && pos <= to) {
      found = { issue, from, to };
    }
  });
  return found;
}

const spellCheckTheme = EditorView.baseTheme({
  '.cm-spellcheck-issue': {
    textDecoration: 'underline',
    textDecorationColor: 'var(--pm-spellcheck-issue-underline-color)',
    backgroundColor: 'var(--pm-spellcheck-issue-background-color)',
    textDecorationStyle: 'wavy',
  },
  '.cm-spellcheck-tooltip': {
    backgroundColor: 'var(--pm-spellcheck-tooltip-background, #fff) !important',
    border: '1px solid var(--pm-spellcheck-tooltip-border, #ccc) !important',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    padding: '2px',
    maxWidth: '300px',
    maxHeight: '50vh',
    overflowY: 'auto',
    zIndex: '1000',
    fontSize: 'var(--pm-spellcheck-tooltip-font-size, 0.9rem)',
  },
  '.cm-spellcheck-tooltip-empty': {
    padding: '4px 6px',
    color: 'var(--pm-spellcheck-tooltip-text, #666)',
    fontSize: 'inherit',
  },
  '.cm-spellcheck-tooltip-loading': {
    padding: '4px 6px',
    color: 'var(--pm-spellcheck-tooltip-text, #666)',
    fontSize: 'inherit',
    fontStyle: 'italic',
  },
  '.cm-spellcheck-tooltip-error': {
    padding: '4px 6px',
    color: 'var(--pm-spellcheck-tooltip-error, #d32f2f)',
    fontSize: 'inherit',
  },
  '.cm-spellcheck-tooltip-suggestions-container': {
    display: 'flex',
    flexDirection: 'column',
  },
  '.cm-spellcheck-tooltip-heading': {
    padding: '4px 6px',
    color: 'var(--pm-spellcheck-tooltip-text, #666)',
    fontSize: '0.85em',
    fontWeight: '600',
    borderBottom: '1px solid var(--pm-spellcheck-tooltip-border, #ccc)',
    marginBottom: '2px',
  },
  '.cm-spellcheck-tooltip-suggestions': {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  '.cm-spellcheck-tooltip-actions-container': {
    display: 'flex',
    flexDirection: 'column',
    borderBottom:
      '1px solid var(--pm-spellcheck-tooltip-actions-border, var(--pm-spellcheck-tooltip-border, #ccc))',
    marginBottom: '4px',
    paddingBottom: '4px',
  },
  '.cm-spellcheck-tooltip-actions': {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  '.cm-spellcheck-tooltip-item': {
    padding: '3px 6px',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 'inherit',
    color: 'var(--pm-spellcheck-tooltip-text, #333)',
    borderRadius: '2px',
    transition: 'background-color 0.1s',
  },
  '.cm-spellcheck-tooltip-item:hover': {
    backgroundColor: 'var(--pm-spellcheck-tooltip-hover, #f0f0f0)',
  },
  '.cm-spellcheck-tooltip-item-preferred': {
    fontWeight: '600',
  },
});

export const spellCheckExtension = [
  spellCheckState,
  spellCheckDecorations,
  tooltipState,
  contextMenuHandler,
  spellCheckKeymap,
  ...closeTooltipHandlers,
  spellCheckTheme,
];

// Helper to create the effect value conveniently
export const setSpellCheckIssues = (
  issues: Range<SpellCheckIssue>[],
): StateEffect<SpellCheckEffect> => spellCheckEffect.of({ issues });

// Re-export tooltip-related exports
export {
  setTooltip,
  tooltipState,
  showSpellCheckTooltip,
  contextMenuHandler,
  spellCheckKeymap,
  closeTooltipHandlers,
} from './tooltip';
