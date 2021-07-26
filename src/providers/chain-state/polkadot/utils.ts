import type { ApiPromise } from '@polkadot/api';
import { addHexPrefix, stripHexPrefix } from 'ethereumjs-util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto';

export const getCallHexAndHash = function (api: ApiPromise, to: string, amount: string) {
  const call = api.tx.balances.transfer(to, amount);
  const callMethodHash = call.method.hash;
  const callMethodHex = call.method.toHex();
  return { call, callMethodHash, callMethodHex };
};

export const trimObjectPrefix = <T = Record<string, string>>(source: T): T => {
  return Object.entries(source).reduce((pre, [k, v]) => {
    pre[k] = stripHexPrefix(v);
    return pre;
  }, {} as T);
};

export const pubKeyToBlack2Address = (publicKey: string, ss58Format?: number) => {
  publicKey = addHexPrefix(publicKey);
  return encodeAddress(blake2AsU8a(publicKey), ss58Format);
};
