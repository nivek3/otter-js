import type { ApiPromise } from '@polkadot/api';
import { Callback, Codec, Constructor, IKeyringPair, SignatureOptions } from '@polkadot/types/types';
import { addHexPrefix, stripHexPrefix } from 'ethereumjs-util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto';

export const getCallHexAndHash = function (api: ApiPromise, to: string, amount: string) {
  const call = api.tx.balances.transfer(to, amount);
  const callMethodHash = call.method.hash;
  const callMethodHex = call.method.toHex();
  return { call, callMethodHash, callMethodHex };
};

export const getExtrinsicEra = async function (api: ApiPromise, period: number) {
  const signedBlock = await api.rpc.chain.getBlock();
  const currentHeight = signedBlock.block.header.number;
  const blockHash = signedBlock.block.header.hash.toHex();
  const era = api.createType('ExtrinsicEra', { current: currentHeight, period });
  return { blockHash, blockNumber: currentHeight, era: era.toHex() };
};

export const getSignerPayload = async function (api: ApiPromise, method: string, nonce: number, period?: number, address?: string) {
  const options = {
    method,
    nonce,
    blockHash: api.genesisHash,
    genesisHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address,
  };
  if (period) {
    const extras = await getExtrinsicEra(api, period);
    Object.assign(options, extras);
  }
  return api.createType('SignerPayload', options);
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
