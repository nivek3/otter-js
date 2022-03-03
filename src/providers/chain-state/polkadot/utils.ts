import type { ApiPromise } from '@polkadot/api';
import { ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';

import type { SignerPayload } from '@polkadot/types/interfaces/extrinsics';
import { addHexPrefix, stripHexPrefix } from 'ethereumjs-util';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from './const';

export const getCallHexAndHash = function (tx: SubmittableExtrinsic<ApiTypes>) {
  const callHash: string = tx.method.hash.toHex();
  const callHex: string = tx.method.toHex();
  return { callHash: stripHexPrefix(callHash), callHex: stripHexPrefix(callHex) };
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

export const getMethodHexAndSignatureHash = async function (
  api: ApiPromise,
  tx: SubmittableExtrinsic<ApiTypes, ISubmittableResult>,
  signer: string,
  nonce: number,
  period?: number,
) {
  const callHex: string = tx.method.toHex();
  const callHash: string = tx.method.hash.toHex();

  const payload = await getSignerPayload(api, callHex, nonce, period);
  tx.addSignature(signer, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized: string = tx.toHex();
  const hash: string = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return { callHex, callHash, hash, serialized };
};

// https://github.com/polkadot-js/api/blob/master/packages/types/src/extrinsic/util.ts
export function getSignerSignatureHash(api: ApiPromise, payload: SignerPayload) {
  const { data } = payload.toRaw();
  const dataU8a = hexToU8a(data);
  return dataU8a.length > 256 ? api.registry.hash(dataU8a).toHex() : data;
}

export const stripObjectHexPrefix = <T = Record<string, string>>(source: T): T => {
  return Object.entries(source).reduce((pre, [k, v]) => {
    pre[k] = stripHexPrefix(v);
    return pre;
  }, {} as T);
};

export const pubKeyToBlack2Address = (publicKey: string, ss58Format?: number) => {
  publicKey = addHexPrefix(publicKey);
  return encodeAddress(blake2AsU8a(publicKey), ss58Format);
};
