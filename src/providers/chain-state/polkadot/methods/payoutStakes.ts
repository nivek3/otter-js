import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import { getCallHexAndHash, getMethodHexAndSignatureHash, stripObjectHexPrefix } from '../utils';

interface Input {
  api: ApiPromise;
  from: string;
  validatorStash: string;
  era: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const payoutStakers = async function ({ api, from, validatorStash, era, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.staking.payoutStakers(validatorStash, era);

  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, from, nonce, period);
  const { partialFee, weight } = await api.tx.staking.payoutStakers(validatorStash, era).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
