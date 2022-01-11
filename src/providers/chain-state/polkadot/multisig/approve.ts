import type { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';

import { AppError, errors } from '../../../../error';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix, getSignerPayload, getSignerSignatureHash } from '../utils';

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
  period?: number;
}

export const multisigApproveAsMulti = async function ({
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
  period,
}: TransferParams) {
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );
  const { callMethodHash } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(from, callMethodHash);
  if (info.isSome) {
    throw new AppError(errors.TIME_POINT_FOUND);
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

  // create the payload
  const payload = await getSignerPayload(api, method, nonce, period);

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return trimObjectPrefix({
    method,
    serialized,
    hash,
  });
};
