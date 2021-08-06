import { addHexPrefix } from 'ethereumjs-util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from '../const';
import { trimObjectPrefix } from '../utils';

export interface RebuildParams {
  api: ApiPromise;
  serialized: string;
  nonce: number;
}

export const rebuild = function ({ api, serialized, nonce }: RebuildParams) {
  const extrinsic = api.createType('Extrinsic', addHexPrefix(serialized));

  const method = extrinsic.method.toHex();
  const sender = extrinsic.signer.toString();
  const payload = api.createType('SignerPayload', {
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    era: extrinsic.era,

    address: sender,
    method,

    nonce,
  });

  extrinsic.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const extrinsicHex = extrinsic.toHex();
  const txHash = u8aToHex(extrinsic.hash);
  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    txHash,
    method,
    serialized: extrinsicHex,
    hash,
  });
};
