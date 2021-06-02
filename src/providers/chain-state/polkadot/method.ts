import { transfer as multsig_transfer } from './multisig/transfer';
import { approve as multsig_approve } from './multisig/approve';
import { cancel as multsig_cancel } from './multisig/cancel';

const map = {
  multsig_transfer,
  multsig_approve,
  multsig_cancel,
};

export const getMethod = (type: string) => {
  return map[type];
};
