import { addHexPrefix } from 'ethereumjs-util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from '../const';
import { stripObjectHexPrefix, getExtrinsicEra, getSignerSignatureHash } from '../utils';

export const rebuild = async function (api: ApiPromise, serialized: string, nonce: number, period?: number) {
  const extrinsic = api.createType('Extrinsic', addHexPrefix(serialized));

  const method = extrinsic.method.toHex();
  const signer = extrinsic.signer.toString();

  const options = {
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    era: extrinsic.era,

    address: signer,
    method,

    nonce,
  };

  if (period) {
    const extras = await getExtrinsicEra(api, period);
    Object.assign(options, extras);
  }

  const payload = api.createType('SignerPayload', options);

  extrinsic.addSignature(signer, SIGN_PLACEHOLDER, payload.toPayload());

  const extrinsicHex = extrinsic.toHex();
  const txHash = u8aToHex(extrinsic.hash);

  const hash = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return stripObjectHexPrefix({
    txHash,
    method,
    serialized: extrinsicHex,
    hash,
  });
};
