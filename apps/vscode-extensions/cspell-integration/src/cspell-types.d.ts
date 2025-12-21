import type { IssueType } from '@cspell/cspell-types';
import type { ConfigurationScope, ConfigurationTarget, Uri } from 'vscode';

export type UriString = string;
export type DocumentUri = UriString;

export interface TextDocumentRef {
  readonly uri: DocumentUri;
}

export interface TextDocumentInfo extends TextDocumentRef {
  readonly languageId?: string;
  readonly text?: string;
  readonly version?: number;
}

export interface CheckDocumentOptions {
  /**
   * Force a check even if the document would normally be excluded.
   */
  forceCheck?: boolean;
}

export interface Suggestion {
  word: string;
  isPreferred?: boolean;
}

export interface SpellCheckerDiagnosticData {
  /** The text of the issue. It is expected to match `document.getText(diag.range)` */
  text?: string;
  /** Indicate if it is a spell issue or directive issue */
  issueType?: IssueType | undefined;
  /** The issue indicates that the word has been flagged as an error. */
  isFlagged?: boolean | undefined;
  /** Indicate that is is a known spelling issue that is always considered misspelled. */
  isKnown?: boolean | undefined;
  /**
   * Indicate if strict rules should be applied.
   * - `true` indicates that unknown words should be flagged as a misspelling.
   * - `false` indicates that unknown words should be flagged as a suggestion.
   */
  strict?: boolean | undefined;
  /** The issue is a suggested change, but is not considered an error. */
  isSuggestion?: boolean | undefined;
  /** Optional list of suggestions. */
  suggestions?: Suggestion[] | undefined;
}

export type uinteger = number;
export declare namespace uinteger {
  const MIN_VALUE = 0;
  const MAX_VALUE = 2147483647;
  function is(value: any): value is uinteger;
}

export interface Position {
  /**
   * Line position in a document (zero-based).
   *
   * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
   * If a line number is negative, it defaults to 0.
   */
  line: uinteger;
  /**
   * Character offset on a line in a document (zero-based).
   *
   * The meaning of this offset is determined by the negotiated
   * `PositionEncodingKind`.
   *
   * If the character value is greater than the line length it defaults back to the
   * line length.
   */
  character: uinteger;
}

export interface Range {
  /**
   * The range's start position.
   */
  start: Position;
  /**
   * The range's end position.
   */
  end: Position;
}

export interface CheckDocumentIssue extends SpellCheckerDiagnosticData {
  text: string;
  range: Range;
}

export interface CheckDocumentResult {
  uri: DocumentUri;
  errors?: string;
  skipped?: boolean;
  issues?: CheckDocumentIssue[];
}

export interface ConfigTargetWithOptionalResource {
  target: ConfigurationTarget;
  uri?: Uri;
  configScope?: ConfigurationScope;
}

export interface ConfigTargetWithResource extends ConfigTargetWithOptionalResource {
  uri: Uri;
}

export type ConfigTargetResourceFree =
  | ConfigurationTarget.Global
  | ConfigurationTarget.Workspace;
export type ConfigTargetLegacy =
  | ConfigTargetResourceFree
  | ConfigTargetWithResource
  | ConfigTargetWithOptionalResource;

export interface ServerApi {
  spellingSuggestions(
    word: string,
    doc: TextDocumentInfo,
  ): Promise<Suggestion[]>;
}

export interface CSpellClient {
  serverApi: ServerApi;
}

export interface ExtensionApi {
  registerConfig(path: string): void;
  triggerGetSettings(): void;
  enableLanguageId(languageId: string, uri?: string): Promise<void>;
  disableLanguageId(languageId: string, uri?: string): Promise<void>;
  enableCurrentFileType(): Promise<void>;
  disableCurrentFileType(): Promise<void>;
  addWordToUserDictionary(word: string): Promise<void>;
  addWordToWorkspaceDictionary(
    word: string,
    uri?: string | null | Uri,
  ): Promise<void>;
  enableLocale(target: ConfigTargetLegacy, locale: string): Promise<void>;
  disableLocale(target: ConfigTargetLegacy, locale: string): Promise<void>;
  updateSettings(): boolean;
  cSpellClient(): CSpellClient;
  checkDocument(
    doc: TextDocumentInfo,
    options?: CheckDocumentOptions,
  ): Promise<CheckDocumentResult>;

  /**
   * @deprecated use {@link ExtensionApi.enableLocale}
   */
  enableLocal(isGlobal: boolean, locale: string): Promise<void>;
  /**
   * @deprecated use {@link ExtensionApi.disableLocale}
   */
  disableLocal(isGlobal: boolean, locale: string): Promise<void>;
  /**
   * @deprecated use {@link ExtensionApi.enableCurrentFileType}
   */
  enableCurrentLanguage(): Promise<void>;
  /**
   * @deprecated use {@link ExtensionApi.disableCurrentFileType}
   */
  disableCurrentLanguage(): Promise<void>;
}
