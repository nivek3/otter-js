import { addHexPrefix } from 'ethereumjs-util';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeMultiAddress, sortAddresses } from '@polkadot/util-crypto';

import { AppError, errors } from '@src/error';
import { Validator } from '@src/utils/ajv';

import { approveAsMulti, multisigAsMulti, multisigCancelAsMulti } from './multisig';
import { transfer as batchTransfer, utility as batchUtility } from './batch';
import { transfer, rebuild, sign, decode, boundAndNominate, bondExtra, unbond, nominate, withdrawUnbonded } from './methods';
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
  // staking
  BuildStakingBondAndNominateTransactionRequest,
  BuildStakingNominateTransactionRequest,
  BuildStakingBondExtraTransactionRequest,
  BuildStakingUnbondTransactionRequest,
  BuildStakingWithdrawUnbondedTransactionRequest,
} from '@src/__proto__/polkadot/types';
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
  // staking
  BuildStakingBondAndNominateTransactionSchema,
  BuildStakingNominateTransactionSchema,
  BuildStakingBondExtraTransactionSchema,
  BuildStakingUnbondTransactionSchema,
  BuildStakingWithdrawUnbondedTransactionSchema,
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
    const result = await transfer({
      ...params,
      api,
      from,
      to,
      quantity,
      signer: from,
      nonce,
    });
    return this.getTxReply(result);
  }

  async buildMultisigApproveAsMultiTransaction(req: BuildMultisigApproveAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigApproveAsMultiRequestSchema, req);

    const { network, signer, pubKeys, threshold, params } = req as Required<BuildMultisigApproveAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const multiAddress = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, signer, params?.nonce);
    const result = await approveAsMulti({
      api,
      ss58Format: ss58Format!,
      addresses,
      threshold,
      signer,
      nonce,
      multiAddress,
      callHash: req.callHash!,
      callHex: req.callHex!,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildMultisigAsMultiTransaction(req: BuildMultisigAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigAsMultiRequestSchema, req);

    const { network, signer, pubKeys, threshold, callHash, callHex, params } = req as Required<BuildMultisigAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const multiAddress = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, signer, params?.nonce);
    const maxWeight = params?.maxWeight;

    const result = await multisigAsMulti({
      api,
      ss58Format,
      addresses,
      threshold,
      signer,
      nonce,
      multiAddress,
      callHash,
      callHex,
      maxWeight,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildMultisigCancelAsMultiTransaction(req: BuildMultisigCancelAsMultiRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigCancelRequestSchema, req);

    const { network, params, pubKeys, threshold, signer, callHash, callHex } = req as Required<BuildMultisigCancelAsMultiRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const addresses = pubKeys.map((pubKey) => pubKeyToBlack2Address(pubKey, ss58Format));
    const multiAddress = encodeMultiAddress(addresses, threshold, ss58Format);

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);
    const nonce = await this.getAddressNonce(api, signer, params?.nonce);

    const result = await multisigCancelAsMulti({
      api,
      ss58Format,
      addresses,
      threshold,
      signer,
      nonce,
      multiAddress,
      callHash,
      callHex,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildStakingBondAndNominateTransaction(req: BuildStakingBondAndNominateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildStakingBondAndNominateTransactionSchema, req);

    const { network, params, from, targets, controller, quantity } = req as Required<BuildStakingBondAndNominateTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);

    const result = await boundAndNominate({
      api,
      targets,
      controller,
      quantity,
      signer: from,
      nonce,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildStakingNominateTransaction(req: BuildStakingNominateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildStakingNominateTransactionSchema, req);

    const { network, params, from, targets } = req as Required<BuildStakingNominateTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);

    const result = await nominate({
      api,
      targets,
      signer: from,
      nonce,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildStakingBondExtraTransaction(req: BuildStakingBondExtraTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildStakingBondExtraTransactionSchema, req);

    const { network, params, from, maxAdditional } = req as Required<BuildStakingBondExtraTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);

    const result = await bondExtra({
      api,
      signer: from,
      maxAdditional,
      nonce,
      ...params,
    });

    return this.getTxReply(result);
  }

  async buildStakingUnbondTransaction(req: BuildStakingUnbondTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildStakingUnbondTransactionSchema, req);

    const { network, params, from, quantity } = req as Required<BuildStakingUnbondTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const result = await unbond({
      api,
      signer: from,
      quantity,
      nonce,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildStakingWithdrawUnbondedTransaction(req: BuildStakingWithdrawUnbondedTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildStakingWithdrawUnbondedTransactionSchema, req);

    const { network, params, from, numSlashingSpans } = req as Required<BuildStakingWithdrawUnbondedTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;

    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const nonce = await this.getAddressNonce(api, from, params?.nonce);
    const result = await withdrawUnbonded({
      api,
      from,
      numSlashingSpans,
      signer: from, //
      nonce,
      ...params,
    });
    return this.getTxReply(result);
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

    const { recipients, signer, params, network } = req as Required<BuildBatchTransferTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(recipients) && recipients.length)) throw new AppError(errors.REQUIRE_RECIPIENTS);

    const nonce = await this.getAddressNonce(api, signer, params?.nonce);
    const result = await batchTransfer({
      api,
      recipients,
      signer,
      nonce,
      ...params,
    });
    return this.getTxReply(result);
  }

  async buildBatchTransaction(req: BuildBatchTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildBatchTransactionRequestSchema, req);

    const { txs, signer, params, network } = req as Required<BuildBatchTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    if (!(Array.isArray(txs) && txs.length)) throw new AppError(errors.REQUIRE_TRANSACTIONS);

    const nonce = await this.getAddressNonce(api, signer, params?.nonce);
    const result = await batchUtility({
      api,
      txs: txs.map((tx) => addHexPrefix(tx)),
      signer,
      nonce,
      ...params,
    });
    return this.getTxReply(result);
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
    const { serialized, network, params = {} } = req as Required<RebuildTransactionRequest>;
    const { provider: wss, ss58Format = 0 } = network!;
    const api: ApiPromise = await this.getApi(wss!, ss58Format!);

    const result = await rebuild(api, serialized, params?.nonce!, params?.period);
    return this.getTxReply(result);
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

  getTxReply({ serialized, hash, callHash, callHex, estimatedFee, weight }: Record<string, any>): TransactionReply {
    return {
      callHash,
      callHex,
      estimatedFee,
      serialized,
      weight,
      ...(hash && {
        signatures: [{ hash }],
      }),
    };
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
