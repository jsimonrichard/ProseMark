declare module 'nspell' {
  export default class NSpell {
    constructor(aff: Uint8Array | string, dic: Uint8Array | string);
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): this;
    remove(word: string): this;
  }
}
