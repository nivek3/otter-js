import { trimObjectPrefix } from '../utils';
import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from '../const';

export interface BatchParams {
  api: ApiPromise;
  txs: string[];
  sender: string;
  nonce: number;
}

export const utility = async function ({ api, txs, sender, nonce }: BatchParams) {
  const tx = api.tx.utility.batch(txs);
  const method = tx.method.toHex();
  // // create the payload
  const payload = api.createType('SignerPayload', {
    method,
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: sender,
  });

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
};
