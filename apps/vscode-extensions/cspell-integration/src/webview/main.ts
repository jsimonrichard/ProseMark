import type { WebviewProcMap, VSCodeExtensionProcMap } from '../common';
import {
  registerWebviewMessageHandler,
  registerWebviewMessagePoster,
} from '@prosemark/vscode-extension-integrator/webview';
import {
  SpellCheckIssue,
  spellCheckExtension,
  suggestionFetcher,
  spellCheckActions,
  type SpellCheckActionsConfig,
  spellCheckIssues,
} from '@prosemark/spellcheck-frontend';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';

import './style.css';
import { Compartment, RangeSet } from '@codemirror/state';

const spellcheckIssueCompartment = new Compartment();

// Register message poster to call VSCode extension procedures
const { callProcWithReturnValue } = registerWebviewMessagePoster<
  'cspell-integration',
  VSCodeExtensionProcMap
>(
  'cspell-integration',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  window.proseMark?.vscode as any,
);

const procs: WebviewProcMap = {
  // eslint-disable-next-line @typescript-eslint/require-await
  setup: async () => {
    if (!window.proseMark?.view) {
      return;
    }

    // Create suggestion fetcher callback
    const fetchSuggestions = async (word: string) => {
      try {
        const suggestions = await callProcWithReturnValue(
          'requestSpellCheckSuggestions',
          word,
        );
        return suggestions;
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        return [];
      }
    };

    // Create actions for adding words to dictionaries
    const createActions = (word: string): SpellCheckActionsConfig => ({
      actions: [
        {
          label: `Add "${word}" to workspace dictionary`,
          execute: async (word) => {
            try {
              await callProcWithReturnValue(
                'addWordToWorkspaceDictionary',
                word,
              );
            } catch (error) {
              console.error(
                'Failed to add word to workspace dictionary:',
                error,
              );
            }
          },
        },
        {
          label: `Add "${word}" to user dictionary`,
          execute: async (word) => {
            try {
              await callProcWithReturnValue('addWordToUserDictionary', word);
            } catch (error) {
              console.error('Failed to add word to user dictionary:', error);
            }
          },
        },
      ],
    });

    window.proseMark.view.dispatch({
      effects:
        window.proseMark.extraCodeMirrorExtensions?.reconfigure([
          spellcheckIssueCompartment.of([]),
          spellCheckExtension,
          suggestionFetcher.of(fetchSuggestions),
          spellCheckActions.of(createActions),
        ]) ?? [],
    });
  },

  updateInfo: ({ issues }) => {
    if (!issues || issues.length === 0) {
      return;
    }

    const issue_ranges = issues.map((is) => {
      if (!window.proseMark?.view) {
        throw new Error('View should have been initialized');
      }

      const from =
        window.proseMark.view.state.doc.line(is.range.start.line + 1).from +
        is.range.start.character;
      const to =
        window.proseMark.view.state.doc.line(is.range.end.line + 1).from +
        is.range.end.character;

      // Convert cspell suggestions to spellcheck-frontend format
      const suggestions = is.suggestions?.map((s) => {
        const result: { word: string; isPreferred?: boolean } = {
          word: s.word,
        };
        if (s.isPreferred !== undefined) {
          result.isPreferred = s.isPreferred;
        }
        return result;
      });

      return new SpellCheckIssue(is.text, suggestions).range(from, to);
    });
    window.proseMark?.view?.dispatch({
      effects: spellcheckIssueCompartment.reconfigure([
        spellCheckIssues.of(RangeSet.of(issue_ranges)),
      ]),
    });
  },
};

registerWebviewMessageHandler(
  'cspell-integration',
  procs,
  window.proseMark?.vscode as WebviewVSCodeApiWithPostMessage<
    CallbackFromProcMap<'cspell-integration', WebviewProcMap>
  >,
);
