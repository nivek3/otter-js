export type Block = {
  chain?: string;
  network?: string;
  height: number;
  hash: string;
  confirmations?: number;
  time: Date;
};
