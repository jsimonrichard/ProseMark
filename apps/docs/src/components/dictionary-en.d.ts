declare module 'dictionary-en' {
  type DictionaryCallback = (
    err: Error | null,
    dict: { aff: Buffer; dic: Buffer },
  ) => void;
  function dictionary(callback: DictionaryCallback): void;
  export default dictionary;
}
