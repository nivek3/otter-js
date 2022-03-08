import { ApiPromise } from '@polkadot/api';
import { getCallHexAndHash, stripObjectHexPrefix, getMethodHexAndSignatureHash } from '@src/providers/chain-state/polkadot/utils';

interface Input {
  api: ApiPromise;
  from: string;
  to: string;
  quantity: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const transfer = async function ({ api, from, to, quantity, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.balances.transfer(to, quantity);
  if (methodOnly) return getCallHexAndHash(tx);
  const result = await getMethodHexAndSignatureHash(api, tx, from, nonce, period);
  const { partialFee, weight } = await api.tx.balances.transfer(to, quantity).paymentInfo(signer);
  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
