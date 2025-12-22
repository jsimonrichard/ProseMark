import {
  StateField,
  RangeSetBuilder,
  Transaction,
  RangeSet,
  EditorState,
  StateEffect,
} from '@codemirror/state';
import {
  spellcheckExtension,
  SpellcheckIssue,
  spellcheckIssues,
  suggestionFetcher,
  spellcheckActions,
  type SpellcheckActionsConfig,
} from '@prosemark/spellcheck-frontend';
import NSpell from 'nspell';
import affData from 'dictionary-en/index.aff?raw';
import dicData from 'dictionary-en/index.dic?raw';

const nspell = new NSpell(affData, dicData);

// StateEffect to trigger spellcheck refresh after adding a word
const refreshSpellcheck = StateEffect.define<void>();

// Function to extract words from text (simple word boundary regex)
function extractWords(
  text: string,
): Array<{ word: string; from: number; to: number }> {
  const words: Array<{ word: string; from: number; to: number }> = [];
  const wordRegex = /\b[a-zA-Z']{2,}\b/g;
  let match;
  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      word: match[0],
      from: match.index,
      to: match.index + match[0].length,
    });
  }
  return words;
}

const getIssues = (state: EditorState): RangeSet<SpellcheckIssue> => {
  const text = state.doc.toString();
  const words = extractWords(text);
  const builder = new RangeSetBuilder<SpellcheckIssue>();

  for (const { word, from, to } of words) {
    if (!nspell.correct(word)) {
      console.log('misspelled word', word);
      builder.add(from, to, new SpellcheckIssue(word));
    }
  }

  return builder.finish();
};

// View plugin that computes spell check issues and dispatches them via setSpellcheckIssues
const nSpellcheckExtension = StateField.define<RangeSet<SpellcheckIssue>>({
  create(state) {
    return getIssues(state);
  },

  update(
    value: RangeSet<SpellcheckIssue>,
    tr: Transaction,
  ): RangeSet<SpellcheckIssue> {
    if (tr.docChanged) {
      return getIssues(tr.state);
    }
    // Check if refresh effect was dispatched
    for (const effect of tr.effects) {
      if (effect.is(refreshSpellcheck)) {
        return getIssues(tr.state);
      }
    }
    return value;
  },
  provide: (field) => spellcheckIssues.from(field),
});

// Create actions for adding words to dictionary
const createActions = (word: string): SpellcheckActionsConfig => ({
  actions: [
    {
      label: `Add "${word}" to dictionary`,
      execute: async (word, view) => {
        nspell.add(word);
        // Trigger a refresh of spellcheck issues
        view.dispatch({
          effects: [refreshSpellcheck.of(undefined)],
        });
      },
    },
  ],
});

// Export the extensions needed for spellcheck
export function createSpellcheckExtensions() {
  return [
    spellcheckExtension,
    nSpellcheckExtension,
    suggestionFetcher.of((word) =>
      Promise.resolve(
        nspell.suggest(word).map((suggestion) => ({ word: suggestion })),
      ),
    ),
    spellcheckActions.of(createActions),
  ];
}
