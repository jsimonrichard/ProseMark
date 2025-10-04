export type Change = {
  fromLine: number;
  fromChar: number;
  toLine: number;
  toChar: number;
  insert: string;
};

export type WebViewMessage =
  | {
      type: 'update';
      changes: Change[];
    }
  | {
      type: 'link_click';
      link: string;
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

export const exhaustiveMatchingGuard = (_: never): never => {
  throw new Error('Should not have reached here!');
};
