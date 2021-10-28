import { blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from '../const';
import { trimObjectPrefix, getSignerPayload } from '../utils';
export interface TransferParams {
  api: ApiPromise;
  quantity: string;
  from: string;
  to: string;
  nonce: number;
  period?: number;
}

export const transfer = async function ({ api, quantity, nonce, from, to, period }: TransferParams) {
  const tx = api.tx.balances.transfer(to, quantity);
  const method = tx.method.toHex();

  const payload = await getSignerPayload(api, method, nonce, period);

  tx.addSignature(from, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
};
