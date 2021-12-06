import { addHexPrefix } from 'ethereumjs-util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from '../const';
import { trimObjectPrefix, getExtrinsicEra, getSignerSignatureHash } from '../utils';

export interface RebuildParams {
  api: ApiPromise;
  serialized: string;
  nonce: number;
  period?: number;
}

export const rebuild = async function ({ api, serialized, nonce, period }: RebuildParams) {
  const extrinsic = api.createType('Extrinsic', addHexPrefix(serialized));

  const method = extrinsic.method.toHex();
  const sender = extrinsic.signer.toString();

  const options = {
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    era: extrinsic.era,

    address: sender,
    method,

    nonce,
  };

  if (period) {
    const extras = await getExtrinsicEra(api, period);
    Object.assign(options, extras);
  }

  const payload = api.createType('SignerPayload', options);

  extrinsic.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const extrinsicHex = extrinsic.toHex();
  const txHash = u8aToHex(extrinsic.hash);

  const hash = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return trimObjectPrefix({
    txHash,
    method,
    serialized: extrinsicHex,
    hash,
  });
};
