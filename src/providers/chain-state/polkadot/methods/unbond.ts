import { ApiPromise } from '@polkadot/api';
import { getCallHexAndHash, getMethodHexAndSignatureHash, stripObjectHexPrefix } from '../utils';

interface Input {
  api: ApiPromise;
  quantity: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const unbond = async function ({ api, quantity, signer, nonce, period, methodOnly = false }: Input) {
  const tx = api.tx.staking.unbond(quantity);
  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee } = await api.tx.staking.unbond(quantity).paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
  };
};
