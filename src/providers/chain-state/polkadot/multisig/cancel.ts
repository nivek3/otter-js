import { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';

import { errors, AppError } from '../../../../error';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix } from '../utils';

export interface CancelParams {
  api: ApiPromise;
  ss58Format: number;
  addresses: string[];
  threshold: number;
  quantity: string;
  from: string;
  to: string;
  sender: string;
  nonce: number;
}

export async function cancel({
  api,
  ss58Format, //
  addresses,
  threshold,
  quantity,
  sender,
  nonce,
  from,
  to,
}: CancelParams) {
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );

  const { callMethodHash } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(from, callMethodHash);

  if (!info.isSome) throw new AppError(errors.TIME_POINT_NOT_FOUND);

  const timepoint = info.unwrap().when;

  const tx = api.tx.multisig.cancelAsMulti(
    threshold,
    otherSignatories, //
    timepoint,
    callMethodHash,
  );

  const method = tx.method.toHex();

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
  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
}
