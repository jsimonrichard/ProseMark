import {
  Range,
  RangeSet,
  RangeValue,
  StateEffect,
  StateField,
  Transaction,
  RangeSetBuilder,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';

export class SpellCheckIssue extends RangeValue {
  constructor(public text: string) {
    super();
  }

  eq(other: SpellCheckIssue): boolean {
    return (
      this.text === other.text &&
      this.startSide === other.startSide &&
      this.endSide === other.endSide
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

const spellCheckTheme = EditorView.baseTheme({
  '.cm-spellcheck-issue': {
    textDecoration: 'underline',
    textDecorationColor: 'var(--pm-spellcheck-issue-underline-color)',
    backgroundColor: 'var(--pm-spellcheck-issue-background-color)',
    textDecorationStyle: 'wavy',
  },
});

export const spellCheckExtension = [
  spellCheckState,
  spellCheckDecorations,
  spellCheckTheme,
];

// Helper to create the effect value conveniently
export const setSpellCheckIssues = (
  issues: Range<SpellCheckIssue>[],
): StateEffect<SpellCheckEffect> => spellCheckEffect.of({ issues });
