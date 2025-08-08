import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { foldableSyntaxFacet } from './core';
import { eventHandlersWithClass } from '../utils';

class Checkbox extends WidgetType {
  value: boolean;

  constructor(value: boolean) {
    super();
    this.value = value;
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-checkbox-wrap';

    const el = document.createElement('input');
    el.type = 'checkbox';
    el.className = 'cm-checkbox';
    el.checked = this.value;

    wrap.appendChild(el);
    return wrap;
  }

  ignoreEvent(_event: Event) {
    return false;
  }
}

export const taskExtension = [
  foldableSyntaxFacet.of({
    nodePath: 'BulletList/ListItem/Task/TaskMarker',
    onFold: (state, node) => {
      const value =
        state.doc.sliceString(node.from + 1, node.to - 1).toLowerCase() === 'x';
      return Decoration.replace({
        widget: new Checkbox(value),
      }).range(node.from - 2, node.to);
    },
    onUnFold: (state, node) => {
      return Decoration.mark({
        class: 'cm-checkbox-wrap',
      }).range(node.from - 2, node.to);
    },
    unfoldZone: (_state, node) => ({
      from: node.from - 2,
      to: node.to,
    }),
  }),
  EditorView.domEventHandlers(
    eventHandlersWithClass({
      mousedown: {
        'cm-checkbox': (ev, view) => {
          const pos = view.posAtDOM(ev.target as HTMLElement);
          const change = {
            from: pos + 3,
            to: pos + 4,
            insert: (ev.target as HTMLInputElement).checked ? ' ' : 'x', // this value is old, so the text is swap
          };
          view.dispatch({
            changes: change,
          });
          return true; // prevent default
        },
      },
    }),
  ),
];
