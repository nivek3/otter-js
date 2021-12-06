import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';
import { trimObjectPrefix, getSignerPayload, getSignerSignatureHash } from '../utils';
import { SIGN_PLACEHOLDER } from '../const';

export interface BatchParams {
  api: ApiPromise;
  txs: string[];
  sender: string;
  nonce: number;
  period?: number;
}

export const utility = async function ({ api, txs, sender, nonce, period }: BatchParams) {
  const tx = api.tx.utility.batch(txs);
  const method = tx.method.toHex();

  const payload = await getSignerPayload(api, method, nonce, period, sender);

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
};
