import { ApiPromise } from '@polkadot/api';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto';

export const getCallHexAndHash = function (api: ApiPromise, to: string, amount: string) {
  const call = api.tx.balances.transfer(to, amount);
  const callMethodHash = call.method.hash;
  const callMethodHex = call.method.toHex();
  return { call, callMethodHash, callMethodHex };
};

export const preparePrefix = (key: string, prefix = '0x') => {
  if (!key.startsWith(prefix)) {
    key = prefix + key;
  }
  return key;
};

export const trimPrefix = (key: string, prefix = '0x') => {
  if (key.startsWith(prefix)) {
    key = key.slice(prefix.length);
  }
  return key;
};

export const trimObjectPrefix = <T = Record<string, string>>(source: T, prefix = '0x'): T => {
  return Object.entries(source).reduce((pre, [k, v]) => {
    pre[k] = trimPrefix(v, prefix);
    return pre;
  }, {} as T);
};

export const pubKeyToBlack2Address = (publicKey: string, ss58Format?: number) => {
  publicKey = preparePrefix(publicKey, '0x');
  return encodeAddress(blake2AsU8a(publicKey), ss58Format);
};
