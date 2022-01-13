import { addHexPrefix } from 'ethereumjs-util';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';

import { AppError, errors } from './../../../error';
import { Validator } from '../../../utils/ajv';

import { multisigApproveAsMulti, multisigAsMulti, multisigCancelAsMulti } from './multisig';
import { transfer as batchTransfer, utility as batchUtility } from './batch';
import { transfer, rebuild, sign, decode } from './methods';
import { pubKeyToBlack2Address } from './utils';
import { ApiCache } from './cache';

import {
  TransactionParams,
  TransactionReply,
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  BuildTransferRequest,
  BuildMultisigApproveAsMultiRequest,
  BuildMultisigAsMultiRequest,
  BuildMultisigCancelAsMultiRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  BuildBatchTransferTransactionRequest,
  BuildBatchTransactionRequest,
  RebuildTransactionRequest,
  DecodeTransactionRequest,
} from '../../../__proto__/polkadot/types';
import {
  BuildBatchTransactionRequestSchema,
  BuildBatchTransferTransactionRequestSchema,
  BuildMultisigCancelRequestSchema,
  BuildMultisigAsMultiRequestSchema,
  BuildMultisigApproveAsMultiRequestSchema,
  BuildTransferRequestSchema,
  DecodeTransactionRequestSchema,
  DeployAccountRequestSchema,
  DeployMultisigAccountRequestSchema,
  PolkadotRefSchema,
  SendTransactionRequestSchema,
  SignTransactionRequestSchema,
} from './polkadot.schema';

const validator = new Validator({ schemas: [PolkadotRefSchema] });
export class Provider {
  apis: ApiCache;

  constructor(apiMaxAge = 1000 * 60 * 60) {
    this.apis = new ApiCache({ maxAge: apiMaxAge });
  }

  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network } = req as Required<DeployAccountRequest>;
    const { ss58Format = 0 } = network!;
    return pubKeyToBlack2Address(key, ss58Format);
  }

  deployMultisigAccount(req: DeployMultisigAccountRequest): string {
    validator.assert(DeployMultisigAccountRequestSchema, req);

    const { keys, threshold, network } = req;
    const { ss58Format = 0 } = network!;
    const addresses = keys!.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    return encodeMultiAddress(sortAddresses(addresses, ss58Format), threshold!, ss58Format!);
  }

  async buildTransferTransaction(req: BuildTransferRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferRequestSchema, req);

    const { from, to, quantity, network, params } = req as Required<BuildTransferRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const { method, serialized, hash } = await transfer({
      api,
      nonce,
      quantity,
      from,
      to,
      ...params,
    });

    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigApproveAsMultiTransaction(req: BuildMultisigApproveAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigApproveAsMultiRequestSchema, req);

    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigApproveAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const maxWeight = params?.maxWeight;
    const { method, serialized, hash } = await multisigApproveAsMulti({
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
      ...params,
    });

    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigAsMultiTransaction(req: BuildMultisigAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigAsMultiRequestSchema, req);

    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const maxWeight = params?.maxWeight;

    const { serialized, hash } = await multisigAsMulti({
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
      ...params,
    });
    const signature = { hash };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async buildMultisigCancelAsMultiTransaction(req: BuildMultisigCancelAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigCancelRequestSchema, req);

    const { to, quantity, network, sender, pubKeys, threshold, params } = req as Required<BuildMultisigCancelAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const from = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, sender, params?.nonce);

    const { method, serialized, hash } = await multisigCancelAsMulti({
      api,
      ss58Format: ss58Format!,
      addresses,
      threshold,
      quantity,
      sender,
      nonce: nonce,
      from,
      to,
      ...params,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures, network } = req as Required<SignTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(signatures) && signatures.length)) {
      throw new AppError(errors.INVALID_SIGNATURES);
    }
    const replaceSignature = '02' + signatures[0].signature!;
    const signed = sign({ api, serialized, signature: replaceSignature });

    return {
      hash: signed.txHash,
      serialized: signed.serialized,
    };
  }

  async buildBatchTransferTransaction(req: BuildBatchTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildBatchTransferTransactionRequestSchema, req);

    const { recipients, sender, params, network } = req as Required<BuildBatchTransferTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(recipients) && recipients.length)) throw new AppError(errors.REQUIRE_RECIPIENTS);

    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const { serialized, hash, method } = await batchTransfer({
      api,
      recipients,
      sender,
      nonce,
      ...params,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async buildBatchTransaction(req: BuildBatchTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildBatchTransactionRequestSchema, req);

    const { txs, sender, params, network } = req as Required<BuildBatchTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(txs) && txs.length)) throw new AppError(errors.REQUIRE_TRANSACTIONS);

    const nonce = await this.getAddressNonce(api, sender, params?.nonce);
    const { serialized, hash, method } = await batchUtility({
      api,
      txs: txs.map((tx) => addHexPrefix(tx)),
      sender,
      nonce,
      ...params,
    });
    const signature = { hash };
    return {
      method,
      serialized,
      signatures: [signature],
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const hash = await api.rpc.author.submitExtrinsic(addHexPrefix(serialized) as any);

    return {
      hash: hash.toString(),
    };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    const { serialized: originTx, network, params = {} } = req as Required<RebuildTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const { method, serialized, hash, txHash } = await rebuild({
      api,
      serialized: originTx!,
      nonce: params?.nonce!,
      ...params,
    });
    const signature = { hash };
    return {
      hash: txHash,
      method,
      serialized,
      signatures: [signature],
    };
  }

  async decodeTransaction(req: DecodeTransactionRequest): Promise<TransactionParams> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized, network } = req as Required<DecodeTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    return decode({
      api,
      serialized,
    });
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

  async getApi(wss: string, ss58Format: number, autoConnectMs = 1000 * 10, timeout = 1000 * 60) {
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
      throw new AppError(errors.CREATE_API_FAILED);
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
