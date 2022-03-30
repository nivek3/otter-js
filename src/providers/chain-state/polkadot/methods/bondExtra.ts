import { ApiPromise } from '@polkadot/api';

import { getMethodHexAndSignatureHash, getCallHexAndHash, stripObjectHexPrefix } from '../utils';

interface Input {
  api: ApiPromise;
  maxAdditional: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const bondExtra = async function ({ api, maxAdditional, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.staking.bondExtra(maxAdditional);
  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee, weight } = await api.tx.staking.bondExtra(maxAdditional).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
