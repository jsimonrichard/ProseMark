import { Decoration } from '@codemirror/view';
import { foldableSyntaxFacet } from './core';

export const bulletListExtension = foldableSyntaxFacet.of({
  nodePath: 'BulletList/ListItem/ListMark',
  onFold: (_state, node) => {
    const cursor = node.node.cursor();
    if (cursor.nextSibling() && cursor.name === 'Task') return;

    return Decoration.mark({ class: 'cm-rendered-list-mark' }).range(
      node.from,
      node.to,
    );
  },
});
