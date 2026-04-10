import { dashMarkdownSyntaxExtension, emojiMarkdownSyntaxExtension } from '../fold';
import { escapeMarkdownSyntaxExtension } from '../hide';
import { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';
import { frontmatterMarkdownSyntaxExtension } from './frontmatter';
import { nestedLinkAsPlainText } from './nestedLinkAsPlainText';
import { proseMathMarkdownSyntaxExtension } from './proseMath';

export { markdownTags } from './tags';
export {
  FRONTMATTER_LANGUAGE_LABEL,
  isFrontmatterNode,
  frontmatterMarkdownSyntaxExtension,
} from './frontmatter';
export { nestedLinkAsPlainText } from './nestedLinkAsPlainText';
export { escapeMarkdownSyntaxExtension } from '../hide';
export { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';
export { emojiMarkdownSyntaxExtension, dashMarkdownSyntaxExtension } from '../fold';
export {
  proseMathDelimiterTag,
  proseMathFormulaTag,
  proseMathMarkdownSyntaxExtension,
} from './proseMath';

export const prosemarkMarkdownSyntaxExtensions = [
  additionalMarkdownSyntaxTags,
  frontmatterMarkdownSyntaxExtension,
  nestedLinkAsPlainText,
  escapeMarkdownSyntaxExtension,
  emojiMarkdownSyntaxExtension,
  dashMarkdownSyntaxExtension,
  proseMathMarkdownSyntaxExtension,
];
