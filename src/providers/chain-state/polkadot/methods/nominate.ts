import { ApiPromise } from '@polkadot/api';
import { stripObjectHexPrefix, getCallHexAndHash, getMethodHexAndSignatureHash } from '../utils';

interface Input {
  api: ApiPromise;
  targets: string[];
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const nominate = async function ({ api, targets, signer, nonce, period, methodOnly }: Input) {
  const tx = api.tx.staking.nominate(targets);
  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee, weight } = await api.tx.staking.nominate(targets).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
