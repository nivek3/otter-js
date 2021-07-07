import { blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { SIGN_PLACEHOLDER } from './const';
import { trimObjectPrefix } from './utils';
export interface TransferParams {
  api: ApiPromise;
  quantity: string;
  from: string;
  to: string;
  nonce: number;
}

export const transfer = function ({ api, quantity, nonce, from, to }: TransferParams) {
  const tx = api.tx.balances.transfer(to, quantity);
  const method = tx.method.toHex();

  const payload = api.createType('SignerPayload', {
    method,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    nonce,
    address: from,
  });

  tx.addSignature(from, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const signatureHash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    signatureHash,
  });
};
