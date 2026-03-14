import { dashMarkdownSyntaxExtension, emojiMarkdownSyntaxExtension } from '../fold';
import { escapeMarkdownSyntaxExtension } from '../hide';
import { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';
import { frontmatterMarkdownSyntaxExtension } from './frontmatter';
import { htmlBlockContinuationMarkdownSyntaxExtension } from './htmlBlockContinuation';
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
export { htmlBlockContinuationMarkdownSyntaxExtension } from './htmlBlockContinuation';

export const prosemarkMarkdownSyntaxExtensions = [
  additionalMarkdownSyntaxTags,
  frontmatterMarkdownSyntaxExtension,
  htmlBlockContinuationMarkdownSyntaxExtension,
  nestedLinkAsPlainText,
  escapeMarkdownSyntaxExtension,
  emojiMarkdownSyntaxExtension,
  dashMarkdownSyntaxExtension,
];
