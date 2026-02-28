import { dashMarkdownSyntaxExtension, emojiMarkdownSyntaxExtension } from '../fold';
import { frontmatterMarkdownSyntaxExtension } from '../frontmatter';
import { escapeMarkdownSyntaxExtension } from '../hide';
import { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';

export { markdownTags } from '../markdownTags';
export {
  FRONTMATTER_INFO_SENTINEL,
  isFrontmatterFencedCodeNode,
  isFrontmatterInfo,
  frontmatterMarkdownSyntaxExtension,
} from '../frontmatter';
export { escapeMarkdownSyntaxExtension } from '../hide';
export { additionalMarkdownSyntaxTags } from '../syntaxHighlighting';
export { emojiMarkdownSyntaxExtension, dashMarkdownSyntaxExtension } from '../fold';

export const prosemarkMarkdownSyntaxExtensions = [
  additionalMarkdownSyntaxTags,
  frontmatterMarkdownSyntaxExtension,
  escapeMarkdownSyntaxExtension,
  emojiMarkdownSyntaxExtension,
  dashMarkdownSyntaxExtension,
];
