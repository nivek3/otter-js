import BigNumber from 'bignumber.js';
import { ApiPromise } from '@polkadot/api';
import { sortAddresses, encodeMultiAddress } from '@polkadot/util-crypto';
import { SIGN_PLACEHOLDER } from '../const';
import { getCallHexAndHash } from '../utils';

export interface CancelParams {
  api: ApiPromise;
  ss58PREFIX: number;
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
  ss58PREFIX, //
  addresses,
  threshold,
  quantity,
  sender,
  nonce,
  from,
  to,
}: CancelParams) {
  const MULTISIG = encodeMultiAddress(addresses, threshold, ss58PREFIX);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== sender),
    ss58PREFIX,
  );
  if (from !== MULTISIG) {
    throw new Error('multsig should be same as from');
  }

  const { callMethodHash } = getCallHexAndHash(api, to, quantity);
  const info = await api.query.multisig.multisigs(MULTISIG, callMethodHash);
  if (!info.isSome) {
    throw new Error('do not found the time point..');
  }
  const timepoint = info.unwrap().when;

  const tx = api.tx.multisig.cancelAsMulti(
    threshold,
    otherSignatories, //
    timepoint,
    callMethodHash,
  );

  const payload = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
  });

  tx.addSignature(sender, SIGN_PLACEHOLDER, payload.toPayload());
  const serialized = tx.toHex().slice(2);
  const signatureHash = payload.toRaw().data.slice(2);
  return { serialized, signatureHash };
}
