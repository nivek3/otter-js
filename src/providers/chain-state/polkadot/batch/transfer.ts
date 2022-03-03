import type { ApiPromise } from '@polkadot/api';
import { stripObjectHexPrefix, getMethodHexAndSignatureHash, getCallHexAndHash } from './../utils';
import { Recipient } from '@src/__proto__/polkadot/types';

export interface BatchTransferParams {
  api: ApiPromise;
  recipients: Recipient[];
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const transfer = async function ({ api, recipients, signer, nonce, period, methodOnly = false }: BatchTransferParams) {
  const txs = recipients.map((recipient) => {
    const { value, address } = recipient;
    return api.tx.balances.transfer(address!, value!);
  });
  const calls = txs.map((tx) => tx.method.toHex());
  const tx = api.tx.utility.batch(calls);
  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee } = await api.tx.utility.batch(calls).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
  };
};
