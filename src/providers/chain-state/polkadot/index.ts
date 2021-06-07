import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress } from '@polkadot/util-crypto';
import { transfer as multisigTransfer, approve as approveMultisig, cancel as cancelMultisig } from './multisig';
import { sign } from './sign';
import { transfer } from './transfer';
import { pubKeyToBlack2Address } from './utils';

import { TransactionReply } from '../../../__proto__/common/index';
import {
  DeployAccountRequest,
  TransferRequest,
  MultisigTransferRequest,
  MultisigApproveRequest,
  SignTransactionRequest,
} from '../../../__proto__/polkadot/index';

export class PolkaDotStateProvider {
  deployAccount(req: DeployAccountRequest): string {
    const { keys, threshold, network } = req;
    const { ss58Format } = network!;
    return encodeMultiAddress(keys!, threshold!, ss58Format!);
  }

  async buildTransferTransaction(req: TransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network } = req as Required<TransferRequest>;
    const { wss } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    const { nonce } = await api.query.system.account(from);

    const { serialized, signatureHash } = transfer({
      api,
      nonce: nonce.toNumber(),
      quantity,
      from,
      to,
    });

    return {
      serialized,
      signatureHashes: [signatureHash],
    };
  }

  async buildMultisigTransaction(req: MultisigTransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, sender, pubKeys, threshold, maxWeight } = req as Required<MultisigTransferRequest>;
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    const { nonce } = (await api.query.system.account(sender)) as any;

    const { serialized, signatureHash } = await multisigTransfer({
      api,
      ss58PREFIX: ss58Format,
      addresses: pubKeys.map(pubKeyToBlack2Address),
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

  async multisigApproveTransaction(req: MultisigApproveRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, sender, pubKeys, threshold, maxWeight } = req as Required<MultisigApproveRequest>;
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    const { nonce } = await api.query.system.account(sender);

    const { serialized, signatureHash } = await approveMultisig({
      api,
      ss58Format: ss58Format!,
      addresses: pubKeys.map(pubKeyToBlack2Address),
      threshold: threshold,
      quantity,
      sender,
      nonce: nonce.toNumber(),
      from,
      to,
      maxWeight,
    });

    return {
      serialized,
      signatureHashes: [signatureHash],
    };
  }

  async multisigCancelTransaction(req: MultisigApproveRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, sender, pubKeys, threshold } = req as Required<MultisigApproveRequest>;
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    const { nonce } = await api.query.system.account(sender);

    const { serialized, signatureHash } = await cancelMultisig({
      api,
      ss58PREFIX: ss58Format!,
      addresses: pubKeys.map(pubKeyToBlack2Address),
      threshold: threshold,
      quantity,
      sender,
      nonce: nonce.toNumber(),
      from,
      to,
    });

    return {
      serialized,
      signatureHashes: [signatureHash],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    const { serialized, signature, network } = req as Required<SignTransactionRequest>;
    const { wss } = network!;
    const api: ApiPromise = await this.getApi(wss!);

    if (!(Array.isArray(signature) && signature.length)) {
      throw new Error('pleasure provider the signature');
    }
    const replaceSignature = signature[0].data!;
    const hex = sign({ api, serialized, signature: replaceSignature });
    const extrinsic = api.createType('Extrinsic', hex);

    return {
      serialized: extrinsic.toHex(),
      signatureHashes: [],
    };
  }

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
