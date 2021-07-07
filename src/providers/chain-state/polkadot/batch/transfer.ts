import { trimObjectPrefix } from './../utils';
import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from '../const';
import { Recipient } from './../../../../__proto__/polkadot/types';

export interface BatchTransferParams {
  api: ApiPromise;
  recipients: Recipient[];
  sender: string;
  nonce: number;
}

export const transfer = async function ({ api, recipients, sender, nonce }: BatchTransferParams) {
  const txs = recipients.map((recipient) => {
    const { value, address } = recipient;
    return api.tx.balances.transfer(address!, value!);
  });
  const tx = api.tx.utility.batch(txs.map((tx) => tx.method.toHex()));

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
  const signatureHash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    signatureHash,
  });
};
