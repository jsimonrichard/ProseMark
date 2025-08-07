export type Change = {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert?: string;
};

export type WebViewMessage = {
  type: 'update';
  changes: Change[];
};

export type VSCodeMessage =
  | {
      type: 'set';
      text: string;
    }
  | {
      type: 'update';
      changes: Change[];
    };
