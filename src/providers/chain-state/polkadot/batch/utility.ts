import type { ApiPromise } from '@polkadot/api';
import { stripObjectHexPrefix, getCallHexAndHash, getMethodHexAndSignatureHash } from '../utils';
interface Input {
  api: ApiPromise;
  txs: string[];
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const utility = async function ({ api, txs, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.utility.batch(txs);

  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee, weight } = await api.tx.utility.batch(txs).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
