import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { trimObjectPrefix, getSignerPayload } from './../utils';
import { SIGN_PLACEHOLDER } from '../const';
import { Recipient } from './../../../../__proto__/polkadot/types';

export interface BatchTransferParams {
  api: ApiPromise;
  recipients: Recipient[];
  sender: string;
  nonce: number;
  period?: number;
}

export const transfer = async function ({ api, recipients, sender, nonce, period }: BatchTransferParams) {
  const txs = recipients.map((recipient) => {
    const { value, address } = recipient;
    return api.tx.balances.transfer(address!, value!);
  });
  const tx = api.tx.utility.batch(txs.map((tx) => tx.method.toHex()));

  const method = tx.method.toHex();

  const payload = await getSignerPayload(api, method, nonce, period, sender);

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
};
