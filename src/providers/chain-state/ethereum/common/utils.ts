import { addHexPrefix, BNLike, bufferToHex, importPublic, pubToAddress, toBuffer, toChecksumAddress } from 'ethereumjs-util';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');
import { toBN } from 'web3-utils';

export const pubToBIP55Address = (key: string) => {
  const pubKey = importPublic(toBuffer(addHexPrefix(key)));
  const address = bufferToHex(pubToAddress(pubKey));
  return toChecksumAddress(address);
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
