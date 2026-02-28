declare module 'dictionary-en' {
  type DictionaryCallback = (
    err: Error | null,
    dict: { aff: Uint8Array; dic: Uint8Array },
  ) => void;
  function dictionary(callback: DictionaryCallback): void;
  export default dictionary;
}
