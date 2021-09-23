import BigNumber from 'bignumber.js';
import { decodeAccountID } from 'ripple-address-codec';
export interface Signer {
  Signer: {
    Account: string;
  };
}

export function addressToBigNumber(address: string) {
  const hex = Buffer.from(decodeAccountID(address)).toString('hex');
  return new BigNumber(hex, 16);
}

export function compareSigners(a: Signer, b: Signer) {
  return addressToBigNumber(a.Signer.Account).comparedTo(addressToBigNumber(b.Signer.Account));
}
