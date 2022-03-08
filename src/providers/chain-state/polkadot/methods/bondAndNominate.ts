import { ApiPromise } from '@polkadot/api';
import { getCallHexAndHash, stripObjectHexPrefix, getMethodHexAndSignatureHash } from '@src/providers/chain-state/polkadot/utils';

interface Input {
  api: ApiPromise;
  targets: string[];
  controller: string;
  quantity: string;
  signer: string;
  nonce: number;
  period?: number;
  methodOnly?: boolean;
}

export const boundAndNominate = async function ({ api, targets, controller, quantity, signer, nonce, period, methodOnly = false }: Input) {
  const bound = api.tx.staking.bond(controller, quantity, 'Staked');
  const nominate = api.tx.staking.nominate(targets);
  const txs = [bound.method.toHex(), nominate.method.toHex()];

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
