import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';
import { transfer as multisigTransfer, approve as approveMultisig, cancel as cancelMultisig } from './multisig';
import { transfer as batchTransfer, utility as batchUtility } from './batch';

import { transfer, rebuild, sign, decode } from './methods';
import { pubKeyToBlack2Address, preparePrefix } from './utils';
import { ApiCache } from './cache';

import {
  TransactionParams,
  TransactionReply,
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  BuildTransferRequest,
  BuildMultisigTransferRequest,
  BuildMultisigApproveRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  BuildBatchTransferTransactionRequest,
  BuildBatchTransactionRequest,
  RebuildTransactionRequest,
  DecodeTransactionRequest,
} from '../../../__proto__/polkadot/types';

export class Provider {
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

  async buildTransferTransaction(req: BuildTransferRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, params } = req as Required<BuildTransferRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const { method, serialized, hash } = transfer({
      api,
      nonce,
      quantity,
      from,
      to,
    });

    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigTransaction(req: BuildMultisigTransferRequest): Promise<TransactionReply> {
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigTransferRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const maxWeight = params?.maxWeight;
    const { method, serialized, hash } = await multisigTransfer({
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

    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigApproveTransaction(req: BuildMultisigApproveRequest): Promise<TransactionReply> {
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigApproveRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const maxWeight = params?.maxWeight;

    const { serialized, hash } = await approveMultisig({
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
    const signature = { hash };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigCancelTransaction(req: BuildMultisigApproveRequest): Promise<TransactionReply> {
    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigApproveRequest>;
    const { provider: wss, ss58Format } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, from, params?.nonce);

    const { method, serialized, hash } = await cancelMultisig({
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
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    const { serialized, signatures, network } = req as Required<SignTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(signatures) && signatures.length)) {
      throw new Error('please provider the signature');
    }
    const replaceSignature = '02' + signatures[0].signature!;
    const hex = sign({ api, serialized, signature: replaceSignature });
    const extrinsic = api.createType('Extrinsic', hex);

    return {
      serialized: extrinsic.toHex(),
    };
  }

  async buildBatchTransferTransaction(req: BuildBatchTransferTransactionRequest): Promise<TransactionReply> {
    const { recipients, sender, params, network } = req as Required<BuildBatchTransferTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(recipients) && recipients.length)) {
      throw new Error('please provider the recipients');
    }

    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const { serialized, hash, method } = await batchTransfer({
      api,
      recipients,
      sender,
      nonce,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildBatchTransaction(req: BuildBatchTransactionRequest): Promise<TransactionReply> {
    const { txs, sender, params, network } = req as Required<BuildBatchTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(txs) && txs.length)) {
      throw new Error('please provider the txs');
    }

    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const { serialized, hash, method } = await batchUtility({
      api,
      txs: txs.map((tx) => preparePrefix(tx)),
      sender,
      nonce,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const hash = await api.rpc.author.submitExtrinsic(serialized as any);

    return {
      hash: hash.toString(),
    };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    const { serialized: originTx, network, params = {} } = req as Required<RebuildTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const { method, serialized, hash } = rebuild({
      api,
      serialized: originTx!,
      nonce: params?.nonce!,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async decodeTransaction(req: DecodeTransactionRequest): Promise<TransactionParams> {
    const { serialized, network } = req as Required<DecodeTransactionRequest>;
    const { provider: wss, ss58Format } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const { nonce } = decode({
      api,
      serialized,
    });

    return {
      nonce,
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

export const provider = new Provider();
