import { bufferToHex, pubToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

export const pubToBIP55Address = (key: string) => {
  const pair = ec.keyFromPublic(key, 'hex');
  const decompose = pair.getPublic(false, 'hex');
  const address = bufferToHex(pubToAddress(Buffer.from(decompose, 'hex'), true));
  const bip55 = toChecksumAddress(address);
  return bip55;
};
