import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';
import { transfer as multisigTransfer, approve as approveMultisig, cancel as cancelMultisig } from './multisig';
import { sign } from './sign';
import { transfer } from './transfer';
import { pubKeyToBlack2Address } from './utils';
import { ApiCache } from './cache';

import { TransactionReply, SendTransactionReply } from '../../../__proto__/common/types';
import {
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  TransferRequest,
  MultisigTransferRequest,
  MultisigApproveRequest,
  SignTransactionRequest,
  SendTransactionRequest,
} from '../../../__proto__/polkadot/types';

export class PolkaDotStateProvider {
  apis: ApiCache;

  constructor(apiMaxAge = 1000 * 60 * 60) {
    this.apis = new ApiCache({ maxAge: apiMaxAge });
  }

  deployAccount(req: DeployAccountRequest): string {
    const { key, network } = req as Required<DeployAccountRequest>;
    const { ss58Format } = network!;
    return pubKeyToBlack2Address(key, ss58Format);
  }

  deployMultisigAccount(req: DeployMultisigAccountRequest): string {
    const { keys, threshold, network } = req;
    const { ss58Format } = network!;
    const addresses = keys!.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    return encodeMultiAddress(sortAddresses(addresses, ss58Format), threshold!, ss58Format!);
  }

  async buildTransferTransaction(req: TransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, params } = req as Required<TransferRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);

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
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<MultisigTransferRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const maxWeight = params?.maxWeight;
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
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<MultisigApproveRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const maxWeight = params?.maxWeight;

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
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<MultisigApproveRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);

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
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(signature) && signature.length)) {
      throw new Error('please provider the signature');
    }
    const replaceSignature = '02' + signature[0].data!;
    const hex = sign({ api, serialized, signature: replaceSignature });
    const extrinsic = api.createType('Extrinsic', hex);

    return {
      serialized: extrinsic.toHex(),
      signatureHashes: [],
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<SendTransactionReply> {
    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const hash = await api.rpc.author.submitExtrinsic(serialized as any);

    return {
      hash: hash.toString(),
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

  async getApi(wss: string, ss58Format: number, autoConnectMs = 1000 * 5, timeout = 1000 * 10) {
    const apiKey = this.apis.getKey(wss, ss58Format);
    let api = this.apis.get(apiKey);
    if (api) return api;

    let timer: NodeJS.Timer;

    const provider = new WsProvider(wss, autoConnectMs);
    const proctored = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => {
        resolve(undefined);
      }, timeout);
    });

    api = await Promise.race([
      ApiPromise.create({
        provider,
        types: this.getApiTypes(ss58Format),
      }),
      proctored,
    ]);
    if (!api) {
      await provider.disconnect().catch();
      throw new Error('can not create the api');
    }
    clearTimeout(timer!);
    this.apis.set(apiKey, api);
    return api;
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
