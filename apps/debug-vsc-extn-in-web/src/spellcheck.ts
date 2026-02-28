import { Compartment, type Extension, RangeSet } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  SpellcheckIssue,
  spellcheckActions,
  spellcheckExtension,
  spellcheckIssues,
  suggestionFetcher,
  type SpellcheckActionsConfig,
} from '@prosemark/spellcheck-frontend';
import NSpell from 'nspell';
import affData from 'dictionary-en/index.aff?raw';
import dicData from 'dictionary-en/index.dic?raw';

const nspell = new NSpell(affData, dicData);

interface IssueLike {
  word: string;
  from: number;
  to: number;
}

const extractWords = (text: string): IssueLike[] => {
  const words: IssueLike[] = [];
  const wordRegex = /\b[a-zA-Z]{2,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      word: match[0],
      from: match.index,
      to: match.index + match[0].length,
    });
  }
  return words;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const buildIssueRanges = (text: string) => {
  const misspellings = extractWords(text).filter((w) => !nspell.correct(w.word));
  return misspellings.map(({ word, from, to }) =>
    new SpellcheckIssue(
      word,
      nspell
        .suggest(word)
        .slice(0, 6)
        .map((candidate) => ({ word: candidate })),
    ).range(from, to),
  );
};

export interface DebugSpellcheckHarness {
  extensions: Extension[];
  runSpellcheck: (view: EditorView, delayMs?: number) => Promise<void>;
  clearIssues: (view: EditorView) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setStaleGuard: (enabled: boolean) => void;
  setArtificialDelayMs: (delayMs: number) => void;
  simulateOutdatedApply: (view: EditorView) => void;
}

export const createSpellcheckHarness = (
  log: (message: string) => void,
): DebugSpellcheckHarness => {
  const issueCompartment = new Compartment();
  let autoRefreshEnabled = true;
  let staleResultGuardEnabled = true;
  let artificialDelayMs = 120;
  let latestRequestId = 0;

  const applyIssues = (view: EditorView, text: string) => {
    const issueRanges = buildIssueRanges(text);
    view.dispatch({
      effects: issueCompartment.reconfigure([
        spellcheckIssues.of(RangeSet.of(issueRanges)),
      ]),
    });
    log(`Applied ${issueRanges.length.toString()} spellcheck issue(s).`);
  };

  const runSpellcheck = async (view: EditorView, delayMs?: number) => {
    const requestId = ++latestRequestId;
    const sourceText = view.state.doc.toString();
    const delay = delayMs ?? artificialDelayMs;
    if (delay > 0) {
      await sleep(delay);
    }

    if (staleResultGuardEnabled) {
      if (requestId !== latestRequestId) {
        log(`Dropped stale spellcheck result (request ${requestId.toString()}).`);
        return;
      }
      if (view.state.doc.toString() !== sourceText) {
        log(
          `Dropped out-of-date spellcheck payload after document changed (request ${requestId.toString()}).`,
        );
        return;
      }
    }

    applyIssues(view, sourceText);
  };

  const createActions = (word: string): SpellcheckActionsConfig => ({
    actions: [
      {
        label: `Add "${word}" to dictionary`,
        execute: async (misspelledWord, view) => {
          nspell.add(misspelledWord);
          await runSpellcheck(view, 0);
        },
      },
    ],
  });

  const extensions: Extension[] = [
    issueCompartment.of([spellcheckIssues.of(RangeSet.of([]))]),
    spellcheckExtension,
    suggestionFetcher.of(async (word: string) => {
      return nspell.suggest(word).map((candidate) => ({ word: candidate }));
    }),
    spellcheckActions.of(createActions),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && autoRefreshEnabled) {
        void runSpellcheck(update.view);
      }
    }),
  ];

  return {
    extensions,
    runSpellcheck,
    clearIssues: (view) => {
      view.dispatch({
        effects: issueCompartment.reconfigure([spellcheckIssues.of(RangeSet.of([]))]),
      });
      log('Cleared spellcheck issues.');
    },
    setAutoRefresh: (enabled) => {
      autoRefreshEnabled = enabled;
      log(`Auto spellcheck ${enabled ? 'enabled' : 'disabled'}.`);
    },
    setStaleGuard: (enabled) => {
      staleResultGuardEnabled = enabled;
      log(`Stale spellcheck guard ${enabled ? 'enabled' : 'disabled'}.`);
    },
    setArtificialDelayMs: (delayMs) => {
      artificialDelayMs = Math.max(0, delayMs);
      log(`Spellcheck delay set to ${artificialDelayMs.toString()}ms.`);
    },
    simulateOutdatedApply: (view) => {
      const oldText = view.state.doc.toString();
      applyIssues(view, oldText);
      view.dispatch({
        changes: { from: 0, to: 0, insert: 'x' },
      });
      log(
        'Applied an outdated spellcheck payload and then edited the document to stress stale-range handling.',
      );
    },
  };
};
