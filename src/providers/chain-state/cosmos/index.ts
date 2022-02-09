import { isNil } from 'lodash';
import { Int53 } from '@cosmjs/math';
import { sha256 } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import { createMultisigThresholdPubkey, pubkeyToAddress, encodeSecp256k1Pubkey, Coin } from '@cosmjs/amino';
import { Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes } from '@cosmjs/proto-signing';
import { defaultRegistryTypes, StargateClient, SignerData, makeMultisignedTx } from '@cosmjs/stargate';
import BigNumber from 'bignumber.js';

import { TxRaw, AuthInfo, Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { canonicalSignature } from '../../../utils/signature';
import { Validator } from '../../../utils/ajv';
import { AppError, errors } from '../../../error';
import { TransactionReply } from '../../../__proto__/common/types';
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
} from '../../../__proto__/cosmos/types';

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
} from './cosmos.schema';
import { signAminoInstruction } from './utils';

const validator = new Validator({ schemas: [CosmosRefSchema] });
const registry = new Registry(defaultRegistryTypes);
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
    const { memo = '' } = params!;

    const { accountNumber, sequence, chainId } = await this.getReqFromData({
      ...network,
      ...params,
      from,
    });

    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: from,
        toAddress: to,
        amount: [amount],
      },
    };

    const txBodyEncodeObject = {
      typeUrl: '/cosmos.tx.v1beta1.TxBody',
      value: {
        messages: [msg],
        memo,
      },
    };

    const gasLimit = Number(params!.fee!.gas!);
    const feeAmount = params?.fee!.amount! as Coin;

    const fee = { amount: [feeAmount], gas: gasLimit };
    const bodyBytes = registry.encode(txBodyEncodeObject);

    const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(pubKey!)));
    const authInfoBytes = makeAuthInfoBytes([{ pubkey, sequence }], fee.amount, fee.gas);

    const signDoc = makeSignDoc(bodyBytes, authInfoBytes, chainId, accountNumber);
    const signBytes = makeSignBytes(signDoc);
    const message = toHex(sha256(signBytes));
    const signature = { publicKey: pubKey, hash: message };

    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
    });
    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    const serialized = toHex(TxRaw.encode(txRaw).finish());
    return {
      serialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildMultisigTransferTransaction(req: BuildMultisigTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferTransactionRequestSchema, req);
    const { from, to, pubKeys, amount, network = {}, params = {} } = req as Required<BuildMultisigTransferTransactionRequest>;
    const { memo } = params!;
    const { accountNumber, sequence, chainId } = await this.getReqFromData({
      ...network,
      ...params,
      from,
    });
    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: from,
        toAddress: to,
        amount: [amount],
      },
    };

    const gasLimit = params!.fee!.gas!.toString();
    const feeAmount = params?.fee!.amount! as Coin;
    const fee = { amount: [feeAmount], gas: gasLimit };

    const signingInstruction = {
      accountNumber: accountNumber,
      sequence: sequence,
      chainId: chainId,
    };
    const msgs = [msg];

    const { tx, message } = await signAminoInstruction(pubKeys, msgs, fee, memo, signingInstruction);
    const signatures = pubKeys.map((pubKey) => {
      return {
        pubKey,
        hash: toHex(message),
      };
    });
    const estimatedFee = this.getTxEstimatedFee(fee.amount, fee.gas);
    return {
      serialized: toHex(tx),
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

  async getReqProvider(provider: string): Promise<StargateClient> {
    return StargateClient.connect(provider);
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
  }: Partial<Network & TransactionParams & { from: string }>): Promise<SignerData> {
    if (isNil(accountNumber) || isNil(sequence) || isNil(chainId)) {
      if (!provider) throw new AppError(errors.INVALID_ARGUMENT, { details: 'provider is required' });
      const client = await this.getReqProvider(provider);
      if (isNil(accountNumber) || isNil(sequence)) {
        if (!from) throw new AppError(errors.INVALID_ARGUMENT, { details: 'from is required' });

        const account = await this.getReqAccount(client, from);
        if (!account) throw new AppError(errors.INVALID_ARGUMENT, { details: 'cannot query account info' });
        accountNumber = accountNumber ?? account.accountNumber;
        sequence = sequence ?? account.sequence;
      }
      chainId = chainId ?? (await this.getReqChainId(client, chainId));
    }
    return { accountNumber, sequence, chainId };
  }

  getTxEstimatedFee(coins: Coin[], gasLimit: BigNumber.Value): string {
    const amounts = BigNumber.sum.apply(
      null,
      coins.map((coin) => coin.amount),
    );
    const gas = new BigNumber(gasLimit);
    return new BigNumber(amounts).times(gas).toString();
  }
}

export const provider = new Provider();
