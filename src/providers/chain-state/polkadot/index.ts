import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';
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
    const addresses = keys!.map(pubKeyToBlack2Address);
    return encodeMultiAddress(sortAddresses(addresses, ss58Format), threshold!, ss58Format!);
  }

  async buildTransferTransaction(req: TransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network } = req as Required<TransferRequest>;
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, req.nonce);

    const { serialized, signatureHash } = transfer({
      api,
      nonce,
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
    const { to, quantity, network, sender, pubKeys, threshold, maxWeight } = req as Required<MultisigTransferRequest>;
    const { wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, req.nonce);

    const { serialized, signatureHash } = await multisigTransfer({
      api,
      ss58Format: ss58Format!,
      addresses,
      threshold,
      quantity,
      sender,
      nonce,
      from,
      to,
      maxWeight,
    });

    return {
      serialized,
      signatureHashes: [signatureHash],
    };
  }

  async multisigApproveTransaction(req: MultisigApproveRequest): Promise<TransactionReply> {
    const { to, quantity, network, sender, pubKeys, threshold, maxWeight } = req as Required<MultisigApproveRequest>;
    const { wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, req.nonce);

    const { serialized, signatureHash } = await approveMultisig({
      api,
      ss58Format: ss58Format!,
      addresses,
      threshold,
      quantity,
      sender,
      nonce,
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
    const { to, quantity, network, sender, pubKeys, threshold } = req as Required<MultisigApproveRequest>;
    const { wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, req.nonce);

    const { serialized, signatureHash } = await cancelMultisig({
      api,
      ss58Format: ss58Format!,
      addresses,
      threshold,
      quantity,
      sender,
      nonce: nonce,
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
    const { wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

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

  getApiTypes(ss58Format: number) {
    const cloverTypes = require('@clover-network/node-types');
    const edgewareTypes = require('@edgeware/node-types');
    let types;
    // TODO use the real ss58Format
    if ([42].includes(ss58Format)) {
      // Clover
      types = cloverTypes;
    } else if ([42].includes(ss58Format)) {
      // Kusama
      types = { PalletId: 'u128' };
    } else if ([42].includes(ss58Format)) {
      // Edgeware
      types = edgewareTypes.spec;
    }
    return types;
  }

  async getApi(wss: string, ss58Format: number, autoConnectMs = 1000 * 60) {
    const wsProvider = new WsProvider(wss, autoConnectMs);
    return await ApiPromise.create({
      provider: wsProvider,
      types: this.getApiTypes(ss58Format),
    });
  }

  private async getAddressNonce(api: ApiPromise, from: string, nonce?: number) {
    if (nonce === undefined || nonce === null) {
      const account = await api.query.system.account(from);
      nonce = account.nonce.toNumber();
    }
    return nonce;
  }
}

export const polkaDotStateProvider = new PolkaDotStateProvider();
