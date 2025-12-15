import type { WebviewProcMap } from './common';
import { registerWebviewMessageHandler } from '@prosemark/vscode-extension-integrator/webview';
import {
  setSpellCheckIssues,
  SpellCheckIssue,
  spellCheckExtension,
} from '@prosemark/spellcheck-frontend';
import { StateEffect } from '@codemirror/state';

declare const acquireVsCodeApi: () => unknown;
const vscode = acquireVsCodeApi();

const procs: WebviewProcMap = {
  setup: () => {
    window.proseMark?.view?.dispatch({
      effects: StateEffect.appendConfig.of(spellCheckExtension),
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

registerWebviewMessageHandler('core', procs, vscode as any);
