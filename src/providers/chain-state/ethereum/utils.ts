import { BNLike, bufferToHex, pubToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');
import { toBN } from 'web3-utils';

export const pubToBIP55Address = (key: string) => {
  const pair = ec.keyFromPublic(key, 'hex');
  const decompose = pair.getPublic(false, 'hex');
  const address = bufferToHex(pubToAddress(Buffer.from(decompose, 'hex'), true));
  const bip55 = toChecksumAddress(address);
  return bip55;
};

export const compactPublicKey = (key: string) => {
  if (!key.startsWith('04')) {
    key = '04' + key;
  }
  return ec.keyFromPublic(key, 'hex').getPublic(true, 'hex');
};

export const isBip1559Transaction = (type?: BNLike) => {
  return type && toBN(type.toString()).eqn(2);
};
