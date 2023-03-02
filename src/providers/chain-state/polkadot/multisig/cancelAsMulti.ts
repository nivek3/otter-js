import { addHexPrefix } from '@ethereumjs/util';
import { ApiPromise } from '@polkadot/api';
import { sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';

import { errors, AppError } from '@src/error';
import { getCallHexAndHash, getMethodHexAndSignatureHash, stripObjectHexPrefix } from '@src/providers/chain-state/polkadot/utils';

interface Input {
  api: ApiPromise;
  ss58Format: number;
  addresses: string[];
  threshold: number;
  signer: string;
  nonce: number;
  multiAddress: string;
  callHash: string;
  callHex: string;
  period?: number;
  methodOnly?: boolean;
}
export async function multisigCancelAsMulti({
  api,
  ss58Format,
  addresses,
  threshold,
  signer,
  nonce,
  multiAddress,
  callHash,
  //
  period,
  methodOnly,
}: Input) {
  callHash = addHexPrefix(callHash);
  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58Format);
  if (multiAddress !== MULTISIG) throw new AppError(errors.MULTISIG_ADDRESS_UNMATCHED);

  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer),
    ss58Format,
  );

  const info = await api.query.multisig.multisigs(multiAddress, callHash);
  if (!info.isSome) throw new AppError(errors.TIME_POINT_NOT_FOUND);

  const timepoint = info.unwrap().when;
  const tx = api.tx.multisig.cancelAsMulti(
    threshold,
    otherSignatories, //
    timepoint,
    callHash,
  );
  if (methodOnly) return getCallHexAndHash(tx);

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee, weight } = await api.tx.multisig
    .cancelAsMulti(
      threshold,
      otherSignatories, //
      timepoint,
      callHash,
    )
    .paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
    weight: weight.toNumber(),
  };
}
