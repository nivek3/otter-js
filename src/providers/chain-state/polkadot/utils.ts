import { ApiPromise } from '@polkadot/api';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto';

export const getCallHexAndHash = function (api: ApiPromise, to: string, amount: string) {
  const call = api.tx.balances.transfer(to, amount);
  const callMethodHash = call.method.hash;
  const callMethodHex = call.method.toHex();
  return { callMethodHash, callMethodHex };
};

export const pubKeyToBlack2Address = (publicKey: string) => {
  if (!publicKey.startsWith('0x')) {
    publicKey = '0x' + publicKey;
  }
  return encodeAddress(blake2AsU8a(publicKey));
};
