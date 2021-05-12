import { Coin } from "./Coin";
import BigNumber from 'bignumber.js';

export type TransactionStatus = 
  | 'pending'
  | 'unconfirmed'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'rejected';
export type TransactionInput = { 
  address: string,
  amount: BigNumber,
  coinId: string,
};
export type TransactionOutput = { 
  address: string,
  amount: BigNumber,
  coinId: string,
  memo?: string,
};
export type Transaction = {
  chain?: string;
  network?: string;
  txid: string;
  blockHeight?: number;
  inputs: Array<TransactionInput>;
  outputs: Array<TransactionOutput>;
  coins: Array<Coin>;
  fee: BigNumber;
  status: TransactionStatus | string;
  confirmations?: number;
  time: Date;
};

export type Transactions = {
  chain?: string;
  network?: string;
  total: number,
  limit: number,
  skip: number,
  data: Array<Transaction>;
}