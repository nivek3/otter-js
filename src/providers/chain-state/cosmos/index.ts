import BigNumber from 'bignumber.js';
import { isNil } from 'lodash';
import { Int53, Uint53 } from '@cosmjs/math';
import { sha256 } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import { createMultisigThresholdPubkey, pubkeyToAddress, encodeSecp256k1Pubkey, Coin, StdFee, coins } from '@cosmjs/amino';
import { Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes, EncodeObject } from '@cosmjs/proto-signing';
import { defaultRegistryTypes, StargateClient, SignerData, makeMultisignedTx, GasPrice, calculateFee } from '@cosmjs/stargate';

import { TxRaw, AuthInfo, Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { MsgDelegate, MsgUndelegate, MsgBeginRedelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

import { canonicalSignature } from '@src/utils/signature';
import { Validator } from '@src/utils/ajv';
import { AppError, errors } from '@src/error';
import { TransactionReply } from '@src/__proto__/common/types';

import {
  TransactionParams,
  BuildTransferTransactionRequest,
  BuildMultisigTransferTransactionRequest,
  DeployAccountReply,
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  SignTransactionRequest,
  SignMultisigTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  RebuildTransactionRequest,
  Network,
  Fee as CosmosFee,
  BuildDelegateTransactionRequest,
  BuildUndelegateTransactionRequest,
  BuildRedelegateTransactionRequest,
  BuildWithdrawDelegationRewardTransactionRequest,

  // multisig staking
  BuildMultisigDelegateTransactionRequest,
  BuildMultisigUndelegateTransactionRequest,
  BuildMultisigRedelegateTransactionRequest,
  BuildMultisigWithdrawDelegationRewardTransactionRequest,
} from '@src/__proto__/cosmos/types';

import {
  BuildTransferTransactionRequestSchema,
  CosmosRefSchema,
  DeployMultisigAccountRequestSchema,
  DecodeTransactionRequestSchema,
  DeployAccountRequestSchema,
  SendTransactionRequestSchema,
  SignTransactionRequestSchema,
  RebuildTransactionRequestSchema,
  SignMultisigTransactionRequestSchema,
  BuildMultisigTransferTransactionRequestSchema,
  BuildDelegateTransactionRequestSchema,
  BuildUndelegateTransactionRequestSchema,
  BuildRedelegateTransactionRequestSchema,

  // multisig staking
  BuildWithdrawDelegationRewardTransactionSchema,
  BuildMultisigDelegateTransactionRequestSchema,
  BuildMultisigUndelegateTransactionRequestSchema,
  BuildMultisigRedelegateTransactionRequestSchema,
  BuildMultisigWithdrawDelegationRewardTransactionSchema,
} from './cosmos.schema';
import { signAminoInstruction } from './utils';

const validator = new Validator({ schemas: [CosmosRefSchema] });
const registry = new Registry(defaultRegistryTypes);

interface ReqSignerData extends SignerData {
  client?: StargateClient;
}
export class Provider {
  deployAccount(req: DeployAccountRequest): DeployAccountReply {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network } = req as Required<DeployAccountRequest>;
    const prefix = network?.bech32Prefix || 'cosmos';
    const pubkey = encodeSecp256k1Pubkey(fromHex(key));
    const address = pubkeyToAddress(pubkey, prefix);

    return { address };
  }

  deployMultisigAccount(req: DeployMultisigAccountRequest): DeployAccountReply {
    validator.assert(DeployMultisigAccountRequestSchema, req);

    const { pubKeys, threshold, network } = req as Required<DeployMultisigAccountRequest>;
    const prefix = network?.bech32Prefix || 'cosmos';
    const keys = pubKeys.map((key) => encodeSecp256k1Pubkey(fromHex(key)));
    const multisigPubkey = createMultisigThresholdPubkey(keys, threshold, true);
    const address = pubkeyToAddress(multisigPubkey, prefix);
    return { address };
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferTransactionRequestSchema, req);
    const { from, to, amount, pubKey, network = {}, params = {} } = req as Required<BuildTransferTransactionRequest>;
    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: from,
        toAddress: to,
        amount: [amount],
      },
    };
    const { serialized, signature, estimatedFee } = await this.signDirect(network!, params!, from, pubKey, [msg]);

    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildMultisigTransferTransaction(req: BuildMultisigTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferTransactionRequestSchema, req);
    const { from, to, pubKeys, amount, network = {}, params = {} } = req as Required<BuildMultisigTransferTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: from,
        toAddress: to,
        amount: [amount],
      },
    };
    const { estimatedFee, serialized, signatures } = await this.signMultisigAmino(network!, params!, from, pubKeys, [msg]);

    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const signature = signatures[0].signature;
    const { r, s } = canonicalSignature(signature!);
    const signatureBytes = new Uint8Array([...fromHex(r), ...fromHex(s)]);
    const decodeTxRaw = TxRaw.decode(fromHex(serialized));
    const { bodyBytes, authInfoBytes } = decodeTxRaw;
    const authInfo = AuthInfo.decode(authInfoBytes);
    const authFee: any = Fee.toJSON(authInfo.fee!);
    const fee = { amount: authFee.amount, gas: authFee.gasLimit };

    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
      signatures: [signatureBytes],
    });
    const txRawBytes = TxRaw.encode(txRaw).finish();
    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    return {
      hash: toHex(sha256(txRawBytes)).toUpperCase(),
      serialized: toHex(txRawBytes),
      estimatedFee,
    };
  }

  async signMultisigTransaction(req: SignMultisigTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignMultisigTransactionRequestSchema, req);

    const { serialized, signatures: sigs, threshold, network } = req as Required<SignMultisigTransactionRequest>;
    const prefix = network?.bech32Prefix || 'cosmos';
    const txRaw = TxRaw.decode(fromHex(serialized));
    const { bodyBytes, authInfoBytes } = txRaw;

    const authInfo = AuthInfo.decode(authInfoBytes);
    if (!authInfo.signerInfos[0]?.sequence?.toString()) throw new AppError(errors.INVALID_ARGUMENT, { details: 'Could not decode tx' });

    const sequence = Int53.fromString(authInfo.signerInfos[0].sequence.toString()).toNumber();

    const authFee: any = Fee.toJSON(authInfo.fee!);
    const fee = { amount: authFee.amount, gas: authFee.gasLimit };

    const keys = authInfo.signerInfos.map((signerInfo) => {
      const pubkey = decodePubkey(signerInfo.publicKey!);
      return pubkey!;
    });

    const multisigPubkey = createMultisigThresholdPubkey(keys, threshold, true);

    const signatures: [string, Uint8Array][] = sigs.map((sig) => {
      const { pubKey, signature } = sig;
      const address = pubkeyToAddress(encodeSecp256k1Pubkey(fromHex(pubKey!)), prefix);
      const { r, s } = canonicalSignature(signature!);
      return [address, new Uint8Array([...fromHex(r), ...fromHex(s)])];
    });

    const signedTx = makeMultisignedTx(multisigPubkey, sequence, fee, bodyBytes, new Map(signatures));
    const txRawBytes = TxRaw.encode(signedTx).finish();
    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    return {
      hash: toHex(sha256(txRawBytes)).toUpperCase(),
      serialized: toHex(txRawBytes),
      estimatedFee,
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const api = await this.getReqProvider(network?.provider!);
    const txBytes = fromHex(serialized);
    const { transactionHash } = await api.broadcastTx(txBytes);
    return {
      hash: transactionHash,
    };
  }

  async decodeTransaction(req: DecodeTransactionRequest): Promise<TransactionParams> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeTransactionRequest>;
    const { bodyBytes, authInfoBytes } = TxRaw.decode(fromHex(serialized));

    const authInfo = AuthInfo.decode(authInfoBytes);
    const txBody = registry.decodeTxBody(bodyBytes);

    const { signerInfos, fee } = AuthInfo.toJSON(authInfo) as any;
    const params: TransactionParams = {
      fee: {
        amount: fee.amount[0],
        gas: fee.gasLimit,
      },
      sequence: Number(signerInfos[0].sequence),
      memo: txBody.memo,
    };

    return params;
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(RebuildTransactionRequestSchema, req);

    const { network, serialized, from, pubKey, params = {} } = req as Required<RebuildTransactionRequest>;
    const tx = TxRaw.decode(fromHex(serialized));
    const bodyBytes = tx.bodyBytes;
    const { sequence } = await this.getReqFromData({
      ...network,
      ...params,
      from,
    });
    const authInfo = AuthInfo.decode(tx.authInfoBytes);
    const { fee } = AuthInfo.toJSON(authInfo) as any;
    let gasLimit = fee.gasLimit;

    if (!isNil(params?.fee?.gas)) {
      gasLimit = params!.fee?.gas;
    }
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(pubKey!)));
    const authInfoBytes = makeAuthInfoBytes([{ pubkey, sequence }], fee!.amount, gasLimit);
    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
    });
    const newSerialized = toHex(TxRaw.encode(txRaw).finish());
    const signDoc = makeSignDoc(bodyBytes, authInfoBytes, network!.chainId!, params?.accountNumber!);
    const signBytes = makeSignBytes(signDoc);
    const message = toHex(sha256(signBytes));

    const estimatedFee = this.getTxEstimatedFee(fee.amount, gasLimit);
    const signature = { pubKey, hash: message };
    return {
      serialized: newSerialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildDelegateTransaction(req: BuildDelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildDelegateTransactionRequestSchema, req);

    const {
      network,
      delegator,
      pubKey,
      validator: validatorAddress,
      amount,
      params = {},
    } = req as Required<BuildDelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: MsgDelegate.fromPartial({
        delegatorAddress: delegator,
        validatorAddress,
        amount: amount!,
      }),
    };
    const { serialized, signature, estimatedFee } = await this.signDirect(network!, params!, delegator, pubKey, [msg]);

    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildUndelegateTransaction(req: BuildUndelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildUndelegateTransactionRequestSchema, req);

    const {
      network,
      validator: validatorAddress,
      delegator: delegatorAddress,
      pubKey,
      amount,
      params = {},
    } = req as Required<BuildUndelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: MsgUndelegate.fromPartial({
        delegatorAddress,
        validatorAddress,
        amount: amount!,
      }),
    };
    const { serialized, signature, estimatedFee } = await this.signDirect(network!, params!, delegatorAddress, pubKey, [msg]);

    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildRedelegateTransaction(req: BuildRedelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildRedelegateTransactionRequestSchema, req);

    const {
      network,
      pubKey,
      validatorSrcAddress,
      validatorDstAddress,
      delegator,
      amount,
      params = {},
    } = req as Required<BuildRedelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: MsgBeginRedelegate.fromPartial({
        validatorSrcAddress,
        validatorDstAddress,
        delegatorAddress: delegator,
        amount: amount!,
      }),
    };
    const { serialized, signature, estimatedFee } = await this.signDirect(network!, params!, delegator, pubKey, [msg]);

    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildWithdrawDelegationRewardTransaction(req: BuildWithdrawDelegationRewardTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildWithdrawDelegationRewardTransactionSchema, req);

    const { network, params = {}, validators, delegator, pubKey } = req as Required<BuildWithdrawDelegationRewardTransactionRequest>;
    const msgs = validators.map((validator: string) => {
      return {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: MsgWithdrawDelegatorReward.fromPartial({
          validatorAddress: validator,
          delegatorAddress: delegator,
        }),
      };
    });
    const { serialized, signature, estimatedFee } = await this.signDirect(network!, params!, delegator, pubKey, msgs);
    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  // multisig staking
  async buildMultisigDelegateTransaction(req: BuildMultisigDelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigDelegateTransactionRequestSchema, req);

    const {
      network,
      delegator,
      pubKeys,
      validator: validatorAddress,
      amount,
      params = {},
    } = req as Required<BuildMultisigDelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: MsgDelegate.fromPartial({
        delegatorAddress: delegator,
        validatorAddress,
        amount: amount!,
      }),
    };
    const { serialized, signatures, estimatedFee } = await this.signMultisigAmino(network!, params!, delegator, pubKeys, [msg]);

    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  async buildMultisigUndelegateTransaction(req: BuildMultisigUndelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigUndelegateTransactionRequestSchema, req);

    const {
      network,
      validator: validatorAddress,
      delegator: delegatorAddress,
      pubKeys,
      amount,
      params = {},
    } = req as Required<BuildMultisigUndelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: MsgUndelegate.fromPartial({
        delegatorAddress,
        validatorAddress,
        amount: amount!,
      }),
    };
    const { serialized, signatures, estimatedFee } = await this.signMultisigAmino(network!, params!, delegatorAddress, pubKeys, [msg]);

    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  async buildMultisigRedelegateTransaction(req: BuildMultisigRedelegateTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigRedelegateTransactionRequestSchema, req);

    const {
      network,
      pubKeys,
      validatorSrcAddress,
      validatorDstAddress,
      delegator,
      amount,
      params = {},
    } = req as Required<BuildMultisigRedelegateTransactionRequest>;

    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: MsgBeginRedelegate.fromPartial({
        validatorSrcAddress,
        validatorDstAddress,
        delegatorAddress: delegator,
        amount: amount!,
      }),
    };
    const { serialized, signatures, estimatedFee } = await this.signMultisigAmino(network!, params!, delegator, pubKeys, [msg]);
    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  async buildMultisigWithdrawDelegationRewardTransaction(
    req: BuildMultisigWithdrawDelegationRewardTransactionRequest,
  ): Promise<TransactionReply> {
    validator.assert(BuildMultisigWithdrawDelegationRewardTransactionSchema, req);

    const {
      network,
      params = {},
      validators,
      delegator,
      pubKeys,
    } = req as Required<BuildMultisigWithdrawDelegationRewardTransactionRequest>;
    const msgs = validators.map((validator: string) => {
      return {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: MsgWithdrawDelegatorReward.fromPartial({
          validatorAddress: validator,
          delegatorAddress: delegator,
        }),
      };
    });
    const { serialized, signatures, estimatedFee } = await this.signMultisigAmino(network!, params!, delegator, pubKeys, msgs);
    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  getReqGasPrice(fee: CosmosFee): GasPrice {
    return GasPrice.fromString(fee.gasPrice!);
  }

  getReqGasFee(fee: CosmosFee) {
    return fee.amount?.amount && fee.amount.denom && coins(fee.amount.amount.toString(), fee.amount.denom.toString());
  }

  async estimateGasFee(
    client: StargateClient,
    signerPubKey: string,
    messages: readonly EncodeObject[],
    gasPrice: GasPrice,
    sequence: number,
    memo: string = '',
    multiplier: number = 1.3,
  ): Promise<StdFee> {
    const queryClient = client['forceGetQueryClient']();
    const signer = encodeSecp256k1Pubkey(fromHex(signerPubKey));
    const anyMsgs = messages.map((m) => registry.encodeAsAny(m));

    const { gasInfo } = await queryClient.tx.simulate(anyMsgs, memo, signer, sequence);
    if (!gasInfo) throw new AppError(errors.INVALID_NETWORK, { details: 'Failed to simulate gas' });
    const gasEstimation = Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
    return calculateFee(Math.round(gasEstimation * multiplier), gasPrice);
  }

  async getReqTxFee(
    fee: CosmosFee,
    client: StargateClient,
    signerPubKey: string,
    messages: readonly EncodeObject[],
    sequence: number,
    memo: string = '',
    multiplier: number = 1.3,
  ) {
    const { gas, amount } = fee;
    if (gas && amount) {
      return {
        amount: coins(amount.amount!.toString(), amount.denom!.toString()),
        gas: gas.toString(),
      };
    }
    const gasPrice = this.getReqGasPrice(fee);
    return this.estimateGasFee(client, signerPubKey, messages, gasPrice, sequence, memo, multiplier);
  }

  async signDirect(network: Network, params: TransactionParams, from: string, signerPubKey: string, messages: readonly EncodeObject[]) {
    const { accountNumber, sequence, chainId, client } = await this.getReqFromData({
      ...network,
      ...params,
      from,
    });
    const memo = params.memo || '';
    const txBodyEncodeObject = {
      typeUrl: '/cosmos.tx.v1beta1.TxBody',
      value: {
        messages: messages,
        memo,
      },
    };
    const provider = await this.getReqProvider(network?.provider!, client);
    const fee = await this.getReqTxFee(params?.fee!, provider, signerPubKey!, messages, sequence);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const bodyBytes = registry.encode(txBodyEncodeObject);

    const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(signerPubKey!)));
    const authInfoBytes = makeAuthInfoBytes([{ pubkey, sequence }], fee.amount, gasLimit);

    const signDoc = makeSignDoc(bodyBytes, authInfoBytes, chainId, accountNumber);
    const signBytes = makeSignBytes(signDoc);
    const message = toHex(sha256(signBytes));
    const signature = { pubKey: signerPubKey, hash: message };

    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
    });
    const serialized = toHex(TxRaw.encode(txRaw).finish());

    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    return { serialized, signature, estimatedFee };
  }

  async signMultisigAmino(network: Network, params: TransactionParams, from: string, pubKeys: string[], messages: readonly EncodeObject[]) {
    const memo = params.memo || '';
    const [signerPubKey] = pubKeys;
    const { accountNumber, sequence, chainId, client } = await this.getReqFromData({
      ...network,
      ...params,
      from,
    });
    const signingInstruction = {
      accountNumber: accountNumber,
      sequence: sequence,
      chainId: chainId,
    };
    const provider = await this.getReqProvider(network?.provider!, client);
    const fee = await this.getReqTxFee(params?.fee!, provider, signerPubKey!, messages, sequence);

    const { tx, message } = await signAminoInstruction(pubKeys, messages, fee, memo, signingInstruction);
    const signatures = pubKeys.map((pubKey) => {
      return {
        pubKey,
        hash: toHex(message),
      };
    });

    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    return { serialized: toHex(tx), signatures, estimatedFee };
  }

  async getReqProvider(provider: string, client?: StargateClient): Promise<StargateClient> {
    return client || StargateClient.connect(provider);
  }

  async getReqAccount(client: StargateClient, address: string) {
    return client.getAccount(address);
  }

  async getReqChainId(client: StargateClient, chainId?: string): Promise<string> {
    return chainId ?? (await client.getChainId());
  }

  async getReqFromData({
    from,
    accountNumber,
    sequence,
    chainId,
    provider,
  }: Partial<Network & TransactionParams & { from: string }>): Promise<ReqSignerData> {
    let client: undefined | StargateClient;

    if (isNil(accountNumber) || isNil(sequence) || isNil(chainId)) {
      if (!provider) throw new AppError(errors.INVALID_ARGUMENT, { details: 'provider is required' });
      client = await this.getReqProvider(provider);
      if (isNil(accountNumber) || isNil(sequence)) {
        if (!from) throw new AppError(errors.INVALID_ARGUMENT, { details: 'from is required' });

        const account = await this.getReqAccount(client, from);
        if (!account) throw new AppError(errors.INVALID_ARGUMENT, { details: 'cannot query account info' });

        accountNumber = accountNumber ?? account.accountNumber;
        sequence = sequence ?? account.sequence;
      }
      if (isNil(chainId)) {
        chainId = await this.getReqChainId(client);
      }
    }
    return { accountNumber, sequence, chainId, client };
  }

  getTxEstimatedFee(coins: readonly Coin[], _gasLimit: BigNumber.Value): string {
    return coins?.[0].amount.toString();
  }
}

export const provider = new Provider();
