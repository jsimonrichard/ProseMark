import type { WebviewProcMap } from './common';
import { registerWebviewMessageHandler } from '@prosemark/vscode-extension-integrator/webview';
import {
  setSpellCheckIssues,
  SpellCheckIssue,
  spellCheckExtension,
} from '@prosemark/spellcheck-frontend';
import { StateEffect } from '@codemirror/state';
import { keymap } from '@codemirror/view';

const procs: WebviewProcMap = {
  setup: () => {
    console.warn('spellcheck setup with view', window.proseMark?.view);
    window.proseMark?.view?.dispatch({
      effects:
        window.proseMark.extraCodeMirrorExtensions?.reconfigure([
          keymap.of([
            {
              key: 'Alt-p',
              run: () => {
                console.log("hello from webview's keymap");
                return true;
              },
            },
          ]),
          spellCheckExtension,
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
      return new SpellCheckIssue(is.text).range(from, to);
    });
    window.proseMark?.view?.dispatch({
      effects: setSpellCheckIssues(issue_ranges),
    });
  },
};

registerWebviewMessageHandler(
  'cspell-integration',
  procs,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  window.proseMark?.vscode as any,
);
