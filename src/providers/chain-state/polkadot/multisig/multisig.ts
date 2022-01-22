import { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';

import { errors, AppError } from '../../../../error';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix, getSignerPayload, getSignerSignatureHash } from '../utils';

export interface ApproveParams {
  api: ApiPromise;
  ss58Format: number;
  addresses: string[];
  threshold: number;
  quantity: string;
  from: string;
  to: string;
  sender: string;
  maxWeight?: number;
  storeCall?: boolean;
  nonce: number;
  period?: number;
}

export async function multisigAsMulti({
  api,
  ss58Format, //
  addresses,
  threshold,
  quantity,
  sender,
  nonce,
  from,
  to,
  storeCall = false,
  maxWeight = 640000000,
  period,
}: ApproveParams) {
  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58Format);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );

  if (from !== MULTISIG) throw new AppError(errors.MULTISIG_ADDRESS_UNMATCHED);

  const { callMethodHash, callMethodHex } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(MULTISIG, callMethodHash);

  if (!info.isSome) throw new AppError(errors.TIME_POINT_NOT_FOUND);

  const timePoint = info.unwrap().when;

  const originTx = api.tx.multisig.asMulti(
    threshold,
    otherSignatories, //
    timePoint,
    callMethodHex,
    storeCall,
    maxWeight,
  );

  const tx = api.tx.multisig.asMulti(
    threshold,
    otherSignatories, //
    timePoint,
    callMethodHex,
    storeCall,
    maxWeight,
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
