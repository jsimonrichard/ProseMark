import type { WebviewProcMap, VSCodeExtensionProcMap } from '../common';
import {
  registerWebviewMessageHandler,
  registerWebviewMessagePoster,
} from '@prosemark/vscode-extension-integrator/webview';
import {
  SpellcheckIssue,
  spellcheckExtension,
  suggestionFetcher,
  spellcheckActions,
  type SpellcheckActionsConfig,
  spellcheckIssues,
} from '@prosemark/spellcheck-frontend';
import type {
  CallbackFromProcMap,
  WebviewVSCodeApiWithPostMessage,
} from '@prosemark/vscode-extension-integrator/types';

import './style.css';
import { Compartment, RangeSet } from '@codemirror/state';

const spellcheckIssueCompartment = new Compartment();
const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

// Register message poster to call VSCode extension procedures
const { callProcWithReturnValue } = registerWebviewMessagePoster<
  'cspell-integration',
  VSCodeExtensionProcMap
>(
  'cspell-integration',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  window.proseMark?.vscode as any,
);

const getDocOffset = (
  lineIndexZeroBased: number,
  charIndexZeroBased: number,
): number | undefined => {
  const view = window.proseMark?.view;
  if (!view) {
    return undefined;
  }
  if (Number.isNaN(lineIndexZeroBased) || Number.isNaN(charIndexZeroBased)) {
    return undefined;
  }

  const safeLineNumber = Math.max(
    1,
    Math.min(lineIndexZeroBased + 1, view.state.doc.lines),
  );
  const line = view.state.doc.line(safeLineNumber);
  const safeChar = Math.max(0, Math.min(charIndexZeroBased, line.length));
  return line.from + safeChar;
};

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
          'requestSpellcheckSuggestions',
          word,
        );
        return suggestions;
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        return [];
      }
    };

    // Create actions for adding words to dictionaries
    const createActions = (word: string): SpellcheckActionsConfig => ({
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
          spellcheckExtension,
          suggestionFetcher.of(fetchSuggestions),
          spellcheckActions.of(createActions),
        ]) ?? [],
    });
  },

  updateInfo: ({ issues }) => {
    const view = window.proseMark?.view;
    if (!view) {
      return;
    }

    const issueRanges = (issues ?? [])
      .map((is) => {
        const from = getDocOffset(is.range.start.line, is.range.start.character);
        const to = getDocOffset(is.range.end.line, is.range.end.character);
        if (from === undefined || to === undefined) {
          return undefined;
        }

        const safeFrom = Math.min(from, to);
        const safeTo = Math.max(from, to);
        if (safeFrom === safeTo) {
          return undefined;
        }

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

        return new SpellcheckIssue(is.text, suggestions).range(safeFrom, safeTo);
      })
      .filter(isDefined);

    view.dispatch({
      effects: spellcheckIssueCompartment.reconfigure([
        spellcheckIssues.of(RangeSet.of(issueRanges)),
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
