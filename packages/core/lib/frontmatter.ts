import type { EditorState } from '@codemirror/state';
import type { BlockContext, Line, MarkdownConfig } from '@lezer/markdown';
import { parseMixed, type Input, type SyntaxNodeRef } from '@lezer/common';
import { parser as yamlParser } from '@lezer/yaml';

const FRONTMATTER_DELIMITER = '---';
const FRONTMATTER_ALT_DELIMITER = '...';
const FRONTMATTER_FENCE_LENGTH = 3;
export const FRONTMATTER_INFO_SENTINEL = FRONTMATTER_DELIMITER;

const isDelimiterText = (text: string): boolean => {
  return text === FRONTMATTER_DELIMITER || text === FRONTMATTER_ALT_DELIMITER;
};

const isDelimiterLine = (line: Line): boolean => {
  if (line.pos !== 0) return false;
  const delimiter = line.text.slice(line.pos, line.pos + FRONTMATTER_FENCE_LENGTH);
  if (!isDelimiterText(delimiter)) return false;
  return line.skipSpace(line.pos + FRONTMATTER_FENCE_LENGTH) === line.text.length;
};

const looksLikeFrontmatterBodyStart = (lineText: string): boolean => {
  const trimmed = lineText.trim();
  if (trimmed.length === 0) return false;
  if (isDelimiterText(trimmed)) return true;
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith('- ')
  ) {
    return true;
  }
  return /^['"]?[\w.-]+['"]?\s*:/.test(trimmed) || trimmed.includes(': ');
};

const hasClosingDelimiterAhead = (cx: BlockContext, afterPos: number): boolean => {
  const input = (cx as unknown as { input?: Input }).input;
  if (!input) return true;
  const rest = input.read(afterPos, input.length);
  return /(?:^|\n)(?:---|\.\.\.)[ \t]*(?:\n|$)/.test(rest);
};

export const isFrontmatterInfo = (info: string): boolean =>
  info.trim() === FRONTMATTER_INFO_SENTINEL;

export const isFrontmatterFencedCodeNode = (
  state: EditorState,
  node: Pick<SyntaxNodeRef, 'name' | 'node'>,
): boolean => {
  if (node.name !== 'FencedCode') return false;
  const infoNode = node.node.getChild('CodeInfo');
  if (!infoNode) return false;
  return isFrontmatterInfo(state.doc.sliceString(infoNode.from, infoNode.to));
};

const frontmatterYamlMixedParser = parseMixed((node, input) => {
  if (node.name !== 'FencedCode') return null;
  const infoNode = node.node.getChild('CodeInfo');
  if (!infoNode) return null;
  if (!isFrontmatterInfo(input.read(infoNode.from, infoNode.to))) return null;
  return {
    parser: yamlParser,
    overlay: (inner) => inner.name === 'CodeText',
  };
});

export const frontmatterMarkdownSyntaxExtension: MarkdownConfig = {
  parseBlock: [
    {
      name: 'Frontmatter',
      before: 'HorizontalRule',
      parse: (cx, line) => {
        if (cx.lineStart !== 0 || !isDelimiterLine(line)) return false;
        if (!looksLikeFrontmatterBodyStart(cx.peekLine())) return false;
        if (!hasClosingDelimiterAhead(cx, cx.lineStart + line.text.length + 1))
          return false;

        const from = cx.lineStart + line.pos;
        const elements = [
          cx.elt('CodeMark', from, from + FRONTMATTER_FENCE_LENGTH),
          // Use a sentinel info string so we can detect frontmatter fences.
          cx.elt('CodeInfo', from, from + FRONTMATTER_FENCE_LENGTH),
        ];

        let firstContentLine = true;
        let foundClosingDelimiter = false;

        while (cx.nextLine()) {
          if (isDelimiterLine(line)) {
            const closeFrom = cx.lineStart + line.pos;
            elements.push(
              cx.elt('CodeMark', closeFrom, closeFrom + FRONTMATTER_FENCE_LENGTH),
            );
            foundClosingDelimiter = true;
            cx.nextLine();
            break;
          }

          const textFrom = cx.lineStart + line.basePos;
          const textTo = cx.lineStart + line.text.length;
          if (!firstContentLine) {
            elements.push(cx.elt('CodeText', cx.lineStart - 1, cx.lineStart));
          }
          if (textFrom < textTo) {
            elements.push(cx.elt('CodeText', textFrom, textTo));
          }
          firstContentLine = false;
        }

        if (!foundClosingDelimiter) return false;
        cx.addElement(cx.elt('FencedCode', from, cx.prevLineEnd(), elements));
        return true;
      },
    },
  ],
  wrap: frontmatterYamlMixedParser,
};
