import BigNumber from 'bignumber.js';

export type IBalance = {
  confirmed: BigNumber; 
  unconfirmed: BigNumber;
  coinId: string;
};