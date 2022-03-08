import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import { getCallHexAndHash, getMethodHexAndSignatureHash, stripObjectHexPrefix } from '../utils';

interface Input {
  api: ApiPromise;
  from: string;
  numSlashingSpans: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const withdrawUnbonded = async function ({ api, from, numSlashingSpans, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.staking.withdrawUnbonded(new BN(numSlashingSpans));

  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, from, nonce, period);
  const { partialFee, weight } = await api.tx.staking.withdrawUnbonded(numSlashingSpans).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
};
