import TronWeb from 'tronweb';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');
const utils = TronWeb.utils;

export const pubToBase58Address = (key: string) => {
  const pair = ec.keyFromPublic(key, 'hex');
  const decompose = pair.getPublic(false, 'hex');
  const com_pubKeyBytes = utils.code.hexStr2byteArray(decompose);
  const address = utils.crypto.computeAddress(com_pubKeyBytes);
  return utils.crypto.getBase58CheckAddress(address);
};
