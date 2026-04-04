import { dashMarkdownSyntaxExtension, emojiMarkdownSyntaxExtension } from '../fold';
import { escapeMarkdownSyntaxExtension } from '../hide';
import { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';
import { frontmatterMarkdownSyntaxExtension } from './frontmatter';
import { multiParHTMLBlockMarkdownSyntaxExtension } from './multiParHTMLBlock';
import { nestedLinkAsPlainText } from './nestedLinkAsPlainText';

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
  multiParHTMLBlockMarkdownSyntaxExtension,
  htmlBlockContinuationMarkdownSyntaxExtension,
} from './multiParHTMLBlock';

export const prosemarkMarkdownSyntaxExtensions = [
  additionalMarkdownSyntaxTags,
  frontmatterMarkdownSyntaxExtension,
  multiParHTMLBlockMarkdownSyntaxExtension,
  nestedLinkAsPlainText,
  escapeMarkdownSyntaxExtension,
  emojiMarkdownSyntaxExtension,
  dashMarkdownSyntaxExtension,
];
