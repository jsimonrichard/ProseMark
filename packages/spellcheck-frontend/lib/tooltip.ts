import { StateEffect, StateField, Transaction } from '@codemirror/state';
import {
  EditorView,
  showTooltip,
  type Tooltip,
  type TooltipView,
  keymap,
  type Command,
} from '@codemirror/view';
import {
  SpellCheckIssue,
  type Suggestion,
  suggestionFetcher,
  spellCheckActions,
  findIssueAtPos,
} from './main';

// Tooltip state management using a StateField
export const setTooltip = StateEffect.define<Tooltip | null>();

// Class that implements TooltipView to manage spellcheck tooltip content
class SpellCheckTooltipView implements TooltipView {
  public readonly dom: HTMLElement;
  readonly #issue: SpellCheckIssue;
  readonly #from: number;
  readonly #to: number;
  readonly #fetchSuggestions:
    | ((word: string) => Promise<Suggestion[]>)
    | undefined;

  constructor(
    issue: SpellCheckIssue,
    from: number,
    to: number,
    view: EditorView,
    fetchSuggestions?: (word: string) => Promise<Suggestion[]>,
  ) {
    this.#issue = issue;
    this.#from = from;
    this.#to = to;
    this.#fetchSuggestions = fetchSuggestions;

    this.dom = document.createElement('div');
    this.dom.className = 'cm-spellcheck-tooltip';

    this.#initializeContent(view);
  }

  #initializeContent(view: EditorView): void {
    const wrapper = document.createElement('div');

    // Build actions section first (independent of suggestions)
    const actionsSection = this.#createActionsSection(view);
    if (actionsSection) {
      wrapper.appendChild(actionsSection);
    }

    // Build suggestions section (independent of actions)
    const suggestionsSection = this.#createSuggestionsSection(view);
    wrapper.appendChild(suggestionsSection);

    this.dom.appendChild(wrapper);
  }

  #createSuggestionsSection(view: EditorView): HTMLElement {
    const container = document.createElement('div');

    // If suggestions are already available, show them
    if (
      this.#issue.suggestions &&
      Array.isArray(this.#issue.suggestions) &&
      this.#issue.suggestions.length > 0
    ) {
      container.appendChild(
        this.#createSuggestionsList(this.#issue.suggestions, view),
      );
      return container;
    }

    // If we have a fetcher, show loading and fetch
    if (this.#fetchSuggestions) {
      const loading = document.createElement('div');
      loading.className = 'cm-spellcheck-tooltip-loading';
      loading.textContent = 'Loading suggestions...';
      container.appendChild(loading);

      // Fetch suggestions asynchronously
      this.#fetchSuggestions(this.#issue.text)
        .then((suggestions) => {
          // Replace loading message
          container.innerHTML = '';

          // Ensure suggestions is an array
          if (!Array.isArray(suggestions) || suggestions.length === 0) {
            container.appendChild(this.#createNoSuggestionsMessage());
            return;
          }

          container.appendChild(this.#createSuggestionsList(suggestions, view));
        })
        .catch((error: unknown) => {
          // Replace loading message with error
          container.innerHTML = '';
          container.appendChild(this.#createErrorMessage());
          if (error instanceof Error) {
            console.error('Failed to fetch suggestions:', error);
          } else {
            console.error('Failed to fetch suggestions:', String(error));
          }
        });

      return container;
    }

    // No suggestions and no fetcher
    container.appendChild(this.#createNoSuggestionsMessage());
    return container;
  }

  #createActionsSection(view: EditorView): HTMLElement | null {
    const actionProvider = view.state.facet(spellCheckActions);

    const config = actionProvider(this.#issue.text);
    if (config.actions.length === 0) {
      return null;
    }

    const allActions = config.actions;

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'cm-spellcheck-tooltip-actions-container';

    const actionsHeading = document.createElement('div');
    actionsHeading.className = 'cm-spellcheck-tooltip-heading';
    actionsHeading.textContent = 'Actions';
    actionsContainer.appendChild(actionsHeading);

    const actionsList = document.createElement('div');
    actionsList.className = 'cm-spellcheck-tooltip-actions';

    for (const action of allActions) {
      const item = document.createElement('button');
      item.className = 'cm-spellcheck-tooltip-item';
      item.textContent = action.label;
      item.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await action.execute(this.#issue.text, view);
        } catch (error) {
          if (error instanceof Error) {
            console.error('Failed to execute action:', error);
          } else {
            console.error('Failed to execute action:', String(error));
          }
        } finally {
          view.dispatch({ effects: setTooltip.of(null) });
        }
      };
      actionsList.appendChild(item);
    }

    actionsContainer.appendChild(actionsList);
    return actionsContainer;
  }

  #createSuggestionsList(
    suggestions: Suggestion[],
    view: EditorView,
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-spellcheck-tooltip-suggestions-container';

    const heading = document.createElement('div');
    heading.className = 'cm-spellcheck-tooltip-heading';
    heading.textContent = 'Suggestions';
    container.appendChild(heading);

    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'cm-spellcheck-tooltip-suggestions';

    for (const suggestion of suggestions) {
      const item = document.createElement('button');
      item.className = 'cm-spellcheck-tooltip-item';
      if (suggestion.isPreferred) {
        item.classList.add('cm-spellcheck-tooltip-item-preferred');
      }
      item.textContent = suggestion.word;
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.#onSelect(suggestion.word, view);
      };
      suggestionsList.appendChild(item);
    }

    container.appendChild(suggestionsList);
    return container;
  }

  #createNoSuggestionsMessage(): HTMLElement {
    const noSuggestions = document.createElement('div');
    noSuggestions.className = 'cm-spellcheck-tooltip-empty';
    noSuggestions.textContent = 'No suggestions available';
    return noSuggestions;
  }

  #createErrorMessage(): HTMLElement {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'cm-spellcheck-tooltip-error';
    errorMsg.textContent = 'Failed to load suggestions';
    return errorMsg;
  }

  #onSelect(word: string, view: EditorView): void {
    // Replace the misspelled word with the selected suggestion
    view.dispatch({
      changes: { from: this.#from, to: this.#to, insert: word },
      selection: { anchor: this.#from + word.length },
    });
    // Close tooltip
    view.dispatch({ effects: setTooltip.of(null) });
  }
}

export const tooltipState = StateField.define<Tooltip | null>({
  create: () => null,
  update(value, tr) {
    // Close tooltip on document changes (when text is edited)
    if (tr.docChanged) {
      return null;
    }
    // Update tooltip if setTooltip effect is dispatched
    for (const effect of tr.effects) {
      if (effect.is(setTooltip)) {
        return effect.value;
      }
    }
    return value;
  },
  provide: (f) => showTooltip.from(f),
});

// Function to show tooltip at a position
export function showSpellCheckTooltip(view: EditorView, pos: number): boolean {
  const found = findIssueAtPos(view, pos);
  if (!found) return false;

  const { issue, from, to } = found;

  // Get suggestion fetcher from facet if available
  const fetchers = view.state.facet(suggestionFetcher);
  const fetchSuggestions = fetchers.length > 0 ? fetchers[0] : undefined;

  // Create tooltip
  const tooltip: Tooltip = {
    pos: pos,
    end: pos,
    above: false,
    create(view) {
      return new SpellCheckTooltipView(issue, from, to, view, fetchSuggestions);
    },
  };

  view.dispatch({ effects: setTooltip.of(tooltip) });
  return true;
}

// Right-click handler
export const contextMenuHandler = EditorView.domEventHandlers({
  contextmenu(event, view) {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) return false;

    const found = findIssueAtPos(view, pos);
    if (found) {
      event.preventDefault();
      showSpellCheckTooltip(view, pos);
      return true;
    }
    return false;
  },
});

// Ctrl+. keyboard shortcut handler
const showSuggestionsCommand: Command = (view) => {
  const pos = view.state.selection.main.head;
  return showSpellCheckTooltip(view, pos);
};

export const spellCheckKeymap = keymap.of([
  {
    key: 'Ctrl-.',
    run: showSuggestionsCommand,
  },
]);

// Close tooltip on click outside or escape key
export const closeTooltipHandlers = [
  EditorView.domEventHandlers({
    mousedown(event, view) {
      // Don't close if clicking inside the tooltip
      const target = event.target as HTMLElement;
      if (target.closest('.cm-spellcheck-tooltip')) {
        return false;
      }
      // Close tooltip if clicking outside
      const tooltip = view.state.field(tooltipState);
      if (tooltip) {
        view.dispatch({ effects: setTooltip.of(null) });
      }
      return false;
    },
  }),
  keymap.of([
    {
      key: 'Escape',
      run: (view) => {
        const tooltip = view.state.field(tooltipState);
        if (tooltip) {
          view.dispatch({ effects: setTooltip.of(null) });
          return true;
        }
        return false;
      },
    },
  ]),
];
