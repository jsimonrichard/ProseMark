import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  prosemarkBasicSetup,
  prosemarkBaseThemeSetup,
  prosemarkMarkdownSyntaxExtensions,
  clickLinkHandler,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import {
  pastePlainTextExtension,
  pasteRichTextExtension,
} from '@prosemark/paste-rich-text';
import { GFM } from '@lezer/markdown';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import type {
  Change,
  FrontendError,
  VSCodeExtensionProcMap,
  WebviewProcMap,
  WordCountVSCodeProcs,
} from '../common';
import './style.css';
import { indentUnit } from '@codemirror/language';
import {
  registerWebviewMessageHandler,
  registerWebviewMessagePoster,
} from '@prosemark/vscode-extension-integrator/webview';
import * as CodeMirrorState from '@codemirror/state';
import * as CodeMirrorView from '@codemirror/view';

declare const acquireVsCodeApi: () => unknown;

window.proseMark ??= {};
window.proseMark.vscode = acquireVsCodeApi();
window.proseMark.extraCodeMirrorExtensions = new Compartment();
// Register external modules to be available to other scripts in the webview
window.proseMark.externalModules = {
  '@codemirror/view': CodeMirrorView,
  '@codemirror/state': CodeMirrorState,
};

const { callProcAndForget, callProcWithReturnValue } =
  registerWebviewMessagePoster<'core', VSCodeExtensionProcMap>(
    'core',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    window.proseMark.vscode as any,
  );

const { callProcAndForget: callWordCountProc } = registerWebviewMessagePoster<
  'core.word-count',
  WordCountVSCodeProcs
>(
  'core.word-count',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  window.proseMark.vscode as any,
);

let isRecoveringFromSyncFailure = false;
let hasReportedFatalError = false;
const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
};

const reportFrontendError = (error: FrontendError) => {
  if (error.severity === 'fatal') {
    if (hasReportedFatalError) {
      return;
    }
    hasReportedFatalError = true;
  }

  try {
    callProcAndForget('reportFrontendError', error);
  } catch (reportingError: unknown) {
    console.error(
      'Failed to report ProseMark frontend error to VS Code:',
      reportingError,
      error,
    );
  }
};

const getDocOffset = (
  lineIndexZeroBased: number,
  charIndexZeroBased: number,
): number | undefined => {
  const view = window.proseMark?.view;
  if (!view) {
    return undefined;
  }

  if (
    lineIndexZeroBased < 0 ||
    lineIndexZeroBased >= view.state.doc.lines ||
    Number.isNaN(charIndexZeroBased)
  ) {
    return undefined;
  }

  const line = view.state.doc.line(lineIndexZeroBased + 1);
  const clampedChar = Math.max(0, Math.min(charIndexZeroBased, line.length));
  return line.from + clampedChar;
};

const replaceEditorDocumentText = (text: string): boolean => {
  const view = window.proseMark?.view;
  if (!view) {
    return false;
  }

  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: text,
    },
    userEvent: 'updateFromVSCode',
  });
  return true;
};

const recoverFromStateMismatch = async (
  source: string,
  reason: string,
  error?: unknown,
) => {
  if (isRecoveringFromSyncFailure) {
    return;
  }
  isRecoveringFromSyncFailure = true;
  const details = `${reason}${error ? `\n${formatUnknownError(error)}` : ''}`;

  try {
    const latestText = await callProcWithReturnValue('requestFullDocument');
    const didReplaceText = replaceEditorDocumentText(latestText);
    if (!didReplaceText) {
      reportFrontendError({
        source,
        severity: 'fatal',
        message:
          'ProseMark could not recover because the editor view is unavailable.',
        details,
      });
      return;
    }

    reportFrontendError({
      source,
      severity: 'recoverable',
      message: 'ProseMark detected a state mismatch and automatically re-synced.',
      details,
    });
  } catch (recoveryError: unknown) {
    reportFrontendError({
      source,
      severity: 'fatal',
      message:
        'ProseMark could not recover from an editor state mismatch automatically.',
      details: `${details}\nRecovery failed: ${formatUnknownError(recoveryError)}`,
    });
  } finally {
    isRecoveringFromSyncFailure = false;
  }
};

window.addEventListener('error', (event) => {
  const details = event.error ? formatUnknownError(event.error) : undefined;
  reportFrontendError({
    source: 'window.error',
    severity: 'fatal',
    message: event.message || 'Unhandled frontend error in ProseMark webview.',
    ...(details ? { details } : {}),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  reportFrontendError({
    source: 'window.unhandledrejection',
    severity: 'fatal',
    message: 'Unhandled promise rejection in ProseMark webview.',
    details: formatUnknownError(event.reason),
  });
});

// Send updates to VS Code about text changes and word count
const updateVSCodeExtension = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.selectionSet) {
    const doc = update.state.doc.toString();
    const selection = update.state.selection.main;
    const textToAnalyze = selection.empty
      ? doc
      : update.state.doc.sliceString(selection.from, selection.to);
    const wordCount =
      textToAnalyze.trim().length === 0
        ? 0
        : textToAnalyze.trim().split(/\s+/).length;
    const charCount = textToAnalyze.length;
    callWordCountProc('updateWordCount', wordCount, charCount);
  }

  if (update.docChanged && window.proseMark?.view) {
    update.transactions
      .filter((t) => !t.isUserEvent('updateFromVSCode'))
      .map((t) => {
        const changes: Change[] = [];

        t.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          // calculate line and char (col) numbers from document position
          const fromLine = t.startState.doc.lineAt(fromA);
          const toLine = t.startState.doc.lineAt(toA);
          changes.push({
            // switch to 0-based line numbers
            fromLine: fromLine.number - 1,
            fromChar: fromA - fromLine.from,
            toLine: toLine.number - 1,
            toChar: toA - toLine.from,
            insert: inserted.toString(),
          });
        });

        callProcAndForget('update', changes);
      });
  }
});

const buildEditor = (text: string, vimModeEnabled?: boolean) => {
  const state = EditorState.create({
    doc: text,
    extensions: [
      vimModeEnabled ? [] : [], // A no-op for now
      markdown({
        codeLanguages: languages,
        extensions: [GFM, prosemarkMarkdownSyntaxExtensions],
      }),
      prosemarkBasicSetup(),
      prosemarkBaseThemeSetup(),
      clickLinkHandler.of((url) => {
        callProcAndForget('linkClick', url);
      }),
      htmlBlockExtension,
      pasteRichTextExtension(
        (_event, view, _pastedRangeFrom, pastedRangeTo) => {
          // Because a parent of the CodeMirror scrolls (and not CodeMirror itself)
          // we'll need to manually scroll the end of the selection into view.
          const cursorCoords = view.coordsAtPos(pastedRangeTo);
          if (cursorCoords) {
            document.body.scrollTo({
              top: cursorCoords.top - document.body.clientHeight / 2,
            });
          }
        },
      ),
      pastePlainTextExtension((view, _pastedRangeFrom, pastedRangeTo) => {
        // Because a parent of the CodeMirror scrolls (and not CodeMirror itself)
        // we'll need to manually scroll the end of the selection into view.
        const cursorCoords = view.coordsAtPos(pastedRangeTo);
        if (cursorCoords) {
          document.body.scrollTo({
            top: cursorCoords.top - document.body.clientHeight / 2,
          });
        }
      }),
      updateVSCodeExtension,
      window.proseMark?.extraCodeMirrorExtensions?.of([]) ?? [],
    ],
  });

  const parent = document.querySelector('#codemirror-container');
  if (!parent) {
    throw new Error('Parent element for ProseMark container not found!');
  }
  const view_ = new EditorView({
    state,
    parent,
  });
  parent.addEventListener('click', () => {
    if (
      document.activeElement !== parent &&
      !parent.contains(document.activeElement)
    ) {
      view_.focus(); // Explicitly focus the editor view
    }
  });
  return view_;
};

const procs: WebviewProcMap = {
  init: (text, { vimModeEnabled, ...dynamicConfig }) => {
    window.proseMark ??= {};
    window.proseMark.view?.destroy();
    window.proseMark.view = buildEditor(text, vimModeEnabled);
    procs.setDynamicConfig(dynamicConfig);
    procs.focus();
  },
  set: (text) => {
    if (!replaceEditorDocumentText(text)) {
      reportFrontendError({
        source: 'core.set',
        severity: 'fatal',
        message:
          'Received a full-document sync update before the ProseMark view initialized.',
      });
    }
  },
  update: (changes) => {
    if (!window.proseMark?.view) {
      reportFrontendError({
        source: 'core.update',
        severity: 'fatal',
        message: 'Received a text update before the ProseMark view initialized.',
      });
      return;
    }

    const mappedChanges = changes
      .map((c) => {
        const from = getDocOffset(c.fromLine, c.fromChar);
        const to = getDocOffset(c.toLine, c.toChar);
        if (from === undefined || to === undefined || to < from) {
          return undefined;
        }

        return {
          from,
          to,
          insert: c.insert,
        };
      })
      .filter(isDefined);

    if (mappedChanges.length !== changes.length) {
      void recoverFromStateMismatch(
        'core.update',
        'Received invalid range data while applying VS Code updates.',
      );
      return;
    }

    try {
      window.proseMark.view.dispatch({
        changes: mappedChanges,
        userEvent: 'updateFromVSCode',
      });
    } catch (error: unknown) {
      void recoverFromStateMismatch(
        'core.update',
        'Applying VS Code updates to the ProseMark webview failed.',
        error,
      );
    }
  },
  focus: () => {
    window.proseMark?.view?.focus();
  },
  setDynamicConfig: (dynamicConfig) => {
    const { tabSize = 2, insertSpaces = true } = dynamicConfig;
    const indentUnit_ = insertSpaces ? ' '.repeat(tabSize) : '\t';
    if (window.proseMark?.view) {
      const indentEffect = StateEffect.appendConfig.of([
        EditorState.tabSize.of(tabSize),
        indentUnit.of(indentUnit_),
      ]);
      window.proseMark.view.dispatch({ effects: indentEffect });
    }
    return;
  },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
registerWebviewMessageHandler('core', procs, window.proseMark.vscode as any);
