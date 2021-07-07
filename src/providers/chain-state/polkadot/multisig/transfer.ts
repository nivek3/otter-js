import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix } from '../utils';

export interface TransferParams {
  api: ApiPromise;
  ss58Format: number;
  addresses: string[];
  threshold: number;
  quantity: string;
  from: string;
  to: string;
  sender: string;
  maxWeight?: number;
  nonce: number;
}

export const transfer = async function ({
  api,
  ss58Format, //
  addresses,
  threshold,
  quantity,
  sender,
  nonce,
  from,
  to,
  maxWeight = 640000000,
}: TransferParams) {
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );
  const { callMethodHash } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(from, callMethodHash);
  if (info.isSome) {
    throw new Error('should be the first approval.');
  }

  // approveAsMulti
  const tx = api.tx.multisig.approveAsMulti(
    threshold,
    otherSignatories, //
    null,
    callMethodHash,
    maxWeight,
  );

  const method = tx.method.toHex();

  // // create the payload
  const payload = api.createType('SignerPayload', {
    method,
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: sender,
  });

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const signatureHash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    signatureHash,
  });
};
