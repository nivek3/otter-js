import { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses } from '@polkadot/util-crypto';

import { errors, AppError } from '../../../../error';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix, getSignerPayload, getSignerSignatureHash } from '../utils';

export interface CancelAsMultiParams {
  api: ApiPromise;
  ss58Format: number;
  addresses: string[];
  threshold: number;
  quantity: string;
  from: string;
  to: string;
  sender: string;
  nonce: number;
  period?: number;
}

export async function multisigCancelAsMulti({
  api,
  ss58Format, //
  addresses,
  threshold,
  quantity,
  sender,
  nonce,
  from,
  to,
  period,
}: CancelAsMultiParams) {
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );

  const { callMethodHash } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(from, callMethodHash);

  if (!info.isSome) throw new AppError(errors.TIME_POINT_NOT_FOUND);

  const timepoint = info.unwrap().when;

  const originTx = api.tx.multisig.cancelAsMulti(
    threshold,
    otherSignatories, //
    timepoint,
    callMethodHash,
  );

  const tx = api.tx.multisig.cancelAsMulti(
    threshold,
    otherSignatories, //
    timepoint,
    callMethodHash,
  );

  const method = tx.method.toHex();

  const payload = await getSignerPayload(api, method, nonce, period);

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const hash = u8aToHex(blake2AsU8a(getSignerSignatureHash(api, payload)));

  return {
    ...trimObjectPrefix({
      method,
      serialized,
      hash,
    }),
    originTx,
  };
}
