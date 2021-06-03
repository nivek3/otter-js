import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress } from '@polkadot/util-crypto';
import { transfer as multisigTransfer } from './multisig/transfer';

import { TransactionReply } from '../../../__proto__/common/index';
import { DeployAccountRequest, MultisigTransferRequest } from '../../../__proto__/polkadot/index';

export class PolkaDotStateProvider {
  deployAccount(req: DeployAccountRequest): string {
    const { keys, threshold, network } = req;
    const { ss58Format } = network!;
    return encodeMultiAddress(keys!, threshold!, ss58Format!);
  }

  async buildMultisigTransaction(req: MultisigTransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, sender, pubkeys, threshold, maxWeight } = req;
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    const { nonce } = (await api.query.system.account(sender)) as any;

    const { serialized, signatureHash } = await multisigTransfer({
      api,
      ss58PREFIX: ss58Format,
      addresses: pubkeys,
      threshold: threshold,
      quantity,
      sender,
      nonce: nonce.toNumber(),
      from,
      to,
      maxWeight,
    } as any);

    return {
      serialized,
      signatureHashes: [signatureHash],
    };
  }

  // async signTransaction(params: CSP.RequestParams): Promise<any> {
  //   const { serialized, signature } = params.payload;
  //   const { wss } = params.network.params;
  //   const api: ApiPromise = await this.getApi(wss);

  //   const hex = sign({ api, serialized, signature });
  //   const extrinsic = api.createType('Extrinsic', hex);

  //   const txHash = await api.rpc.author.submitExtrinsic(extrinsic);
  //   console.log(`txHash : ${txHash}`);

  //   return {
  //     serialized: extrinsic.toHex(),
  //     hashForSignature: '',
  //   };
  // }

  async getApi(wss: string, autoConnectMs = 1000 * 60) {
    const cloverTypes = require('@clover-network/node-types');
    const wsProvider = new WsProvider(wss, autoConnectMs);
    return await ApiPromise.create({
      provider: wsProvider,
      types: cloverTypes,
    });
  }
}

export const polkaDotStateProvider = new PolkaDotStateProvider();
