import { addHexPrefix } from 'ethereumjs-util';
import type { ApiPromise } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';
import { sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';

import { AppError, errors } from '@src/error';
import { getCallHexAndHash, getMethodHexAndSignatureHash, stripObjectHexPrefix } from '@src/providers/chain-state/polkadot/utils';

interface Input {
  api: ApiPromise;
  ss58Format: number; //
  addresses: string[];
  threshold: number;
  signer: string;
  nonce: number;
  multiAddress: string;
  callHash: string;
  callHex: string;
  maxWeight?: number;
  period?: number;
  methodOnly?: boolean;
}

export const approveAsMulti = async function ({
  api,
  ss58Format,
  addresses,
  threshold,
  signer,
  nonce,
  multiAddress,
  callHash,

  // callHex,
  maxWeight = 640000000,
  period,
  methodOnly = false,
}: Input) {
  callHash = addHexPrefix(callHash);

  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58Format);
  if (multiAddress !== MULTISIG) throw new AppError(errors.MULTISIG_ADDRESS_UNMATCHED);

  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer),
    ss58Format,
  );
  // approveAsMulti
  const tx = api.tx.multisig.approveAsMulti(
    threshold,
    otherSignatories, //
    null,
    callHash,
    maxWeight,
  );
  if (methodOnly) return getCallHexAndHash(tx);
  const info = await api.query.multisig.multisigs(multiAddress, callHash);
  if (info.isSome) {
    throw new AppError(errors.TIME_POINT_FOUND);
  }

  const result = await getMethodHexAndSignatureHash(api, tx, signer, nonce, period);
  const { partialFee } = await api.tx.multisig
    .approveAsMulti(
      threshold,
      otherSignatories, //
      null,
      callHash,
      maxWeight,
    )
    .paymentInfo(signer);

  return {
    ...stripObjectHexPrefix(result),
    estimatedFee: partialFee.toString(),
  };
};
