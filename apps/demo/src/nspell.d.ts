declare module 'nspell' {
  export default class NSpell {
    constructor(aff: Buffer | string, dic: Buffer | string);
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): this;
    remove(word: string): this;
  }
}
