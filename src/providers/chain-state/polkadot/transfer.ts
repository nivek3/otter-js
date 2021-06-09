import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from './const';

export interface TransferParams {
  api: ApiPromise;
  quantity: string;
  from: string;
  to: string;
  nonce: number;
}

export const transfer = function ({ api, quantity, nonce, from, to }: TransferParams) {
  const tx = api.tx.balances.transfer(to, quantity);

  const payload = api.createType('SignerPayload', {
    method: tx,
    address: from,
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
  });

  tx.addSignature(from, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex().slice(2);
  const signatureHash = payload.toRaw().data.slice(2);
  return { serialized, signatureHash };
};
