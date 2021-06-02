import BigNumber from 'bignumber.js';
import { ApiPromise } from '@polkadot/api';
import { sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';
import { SignPlaceholder } from '../const';
import { getCallHexAndHash } from '../utils';

export interface ApproveParams {
  api: ApiPromise;
  ss58PREFIX: number;
  addresses: string[];
  threshold: number;
  quantity: number;
  decimals: number;
  from: string;
  to: string;
  sender: string;
  maxWeight?: number;
  storeCall: boolean;
  nonce: number;
}

export async function approve({
  api,
  ss58PREFIX, //
  addresses,
  threshold,
  quantity,
  decimals,
  sender,
  nonce,
  from,
  to,
  storeCall = false,
  maxWeight = 50,
}: ApproveParams) {
  const AMOUNT_TO_SEND = new BigNumber(quantity).shiftedBy(decimals).toString();
  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58PREFIX);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58PREFIX,
  );
  if (from !== MULTISIG) {
    throw new Error('multsig should be same as from');
  }

  const { callMethodHash } = getCallHexAndHash(api, to, AMOUNT_TO_SEND);
  const info = await api.query.multisig.multisigs(MULTISIG, callMethodHash);
  if (!info.isSome) {
    throw new Error('do not found the time point..');
  }

  const timePoint = info.unwrap().when;

  const tx = api.tx.multisig.asMulti(
    threshold,
    otherSignatories, //
    timePoint,
    callMethodHash,
    storeCall,
    maxWeight,
  );

  const payload = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
  });

  tx.addSignature(sender, SignPlaceholder, payload.toPayload());
  const serialized = tx.toHex();
  const signatureHash = payload.toRaw().data.slice(2);
  return { serialized, signatureHash };
}
