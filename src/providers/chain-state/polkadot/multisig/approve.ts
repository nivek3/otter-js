import { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { blake2AsU8a, sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash, trimObjectPrefix } from '../utils';

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
}

export async function approve({
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
}: ApproveParams) {
  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58Format);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58Format,
  );

  if (from !== MULTISIG) {
    throw new Error('multsig should be same as from');
  }

  const { callMethodHash, callMethodHex } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(MULTISIG, callMethodHash);
  if (!info.isSome) {
    throw new Error('do not found the time point..');
  }

  const timePoint = info.unwrap().when;

  const tx = api.tx.multisig.asMulti(
    threshold,
    otherSignatories, //
    timePoint,
    callMethodHex,
    storeCall,
    maxWeight,
  );

  const method = tx.method.toHex();

  const payload = api.createType('SignerPayload', {
    method,
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
  });

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());

  const serialized = tx.toHex();
  const signatureHash = u8aToHex(blake2AsU8a(payload.toRaw().data));

  return trimObjectPrefix({
    method,
    serialized,
    signatureHash,
  });
}
