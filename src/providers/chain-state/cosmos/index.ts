import { isNil } from 'lodash';
import { stripHexPrefix } from 'ethjs-util';
import { sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, fromHex, toHex } from '@cosmjs/encoding';
import { pubkeyType, pubkeyToAddress, encodeSecp256k1Pubkey, Coin } from '@cosmjs/amino';
import { Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes } from '@cosmjs/proto-signing';
import { defaultRegistryTypes, StargateClient } from '@cosmjs/stargate';

import { TxRaw, AuthInfo } from '@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx';

import { parseSignature } from '../../../utils/signature';
import { Validator } from '../../../utils/ajv';
import { AppError, errors } from '../../../error';
import { TransactionReply } from '../../../__proto__/common/types';
import {
  TransactionParams,
  BuildTransferTransactionRequest,
  DeployAccountReply,
  DeployAccountRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  RebuildTransactionRequest,
} from '../../../__proto__/cosmos/types';

import {
  BuildTransferTransactionRequestSchema,
  CosmosRefSchema,
  DecodeTransactionRequestSchema,
  DeployAccountRequestSchema,
  SendTransactionRequestSchema,
  SignTransactionRequestSchema,
  RebuildTransactionRequestSchema,
} from './cosmos.schema';

const validator = new Validator({ schemas: [CosmosRefSchema] });
const registry = new Registry(defaultRegistryTypes);
export class Provider {
  deployAccount(req: DeployAccountRequest): DeployAccountReply {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network } = req as Required<DeployAccountRequest>;
    const prefix = network?.bech32Prefix || 'cosmos';
    const pubkey = {
      type: pubkeyType.secp256k1,
      value: toBase64(fromHex(stripHexPrefix(key))),
    };
    const address = pubkeyToAddress(pubkey, prefix);

    return { address };
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferTransactionRequestSchema, req);

    const { from, to, amount, network = {}, params = {} } = req as Required<BuildTransferTransactionRequest>;
    if (isNil(params?.accountNumber) || isNil(params?.sequence)) {
      if (!network?.provider) throw new AppError(errors.INVALID_ARGUMENT, { details: 'online provider is required' });
      const client = await this.getReqProvider(network.provider);
      if (isNil(params?.accountNumber) || isNil(params?.sequence)) {
        const account = await this.getReqAccount(client, from);
        if (!account) throw new AppError(errors.INVALID_ARGUMENT, { details: 'cannot query account info' });
        if (isNil(params?.accountNumber)) {
          params!.accountNumber = account.accountNumber;
        }
        if (isNil(params?.sequence)) {
          params!.sequence = account.sequence;
        }
      }
    }
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
        memo: params?.memo,
      },
    };

    const gasLimit = Number(params!.fee!.gas!);
    const feeAmount = params?.fee!.amount! as Coin;
    const fee = { amount: [feeAmount], gas: params!.fee!.gas };
    const bodyBytes = registry.encode(txBodyEncodeObject);
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(params!.pubKey!)));
    const authInfoBytes = makeAuthInfoBytes([pubkey], fee!.amount, gasLimit, params!.sequence);
    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
    });
    const serialized = toHex(TxRaw.encode(txRaw).finish());
    const signDoc = makeSignDoc(bodyBytes, authInfoBytes, network!.chainId!, params!?.accountNumber);
    const signBytes = makeSignBytes(signDoc);
    const message = toHex(sha256(signBytes));
    const signature = { publicKey: params!.pubKey, hash: message };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const signature = signatures[0].signature;
    const { r, s } = parseSignature(signature!);
    const signatureBytes = new Uint8Array([...fromHex(r), ...fromHex(s)]);
    const newTx = TxRaw.decode(fromHex(serialized));

    const txRaw = TxRaw.fromPartial({
      ...newTx,
      signatures: [signatureBytes],
    });
    const txRawBytes = TxRaw.encode(txRaw).finish();

    return {
      hash: toHex(sha256(txRawBytes)).toUpperCase(),
      serialized: toHex(txRawBytes),
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
    let pubKeyHex = '';
    const { network, serialized, params = {} } = req as Required<RebuildTransactionRequest>;
    const tx = TxRaw.decode(fromHex(serialized));
    const bodyBytes = tx.bodyBytes;

    const authInfo = AuthInfo.decode(tx.authInfoBytes);
    const { fee, signerInfos } = AuthInfo.toJSON(authInfo) as any;
    const signerInfo = signerInfos[0];
    const pub = signerInfo?.publicKey;
    let gasLimit = fee.gasLimit;
    let sequence = signerInfo.sequence;
    if (!isNil(params?.sequence)) {
      sequence = params!.sequence;
    }
    if (!isNil(params?.fee?.gas)) {
      gasLimit = params!.fee?.gas;
    }

    if (isNil(params?.accountNumber)) {
      if (!network?.bech32Prefix) throw new AppError(errors.INVALID_ARGUMENT, { details: 'please provider accountNumber or bech32Prefix' });
      const client = await this.getReqProvider(network?.provider!);
      const pubkey = decodePubkey({ ...pub, value: fromBase64(pub.value) });
      pubKeyHex = toHex(fromBase64(pubkey!.value));
      const address = pubkeyToAddress(pubkey!, network?.bech32Prefix!);
      const account = await this.getReqAccount(client, address);
      params!.accountNumber = account?.accountNumber;
    }

    const authInfoBytes = makeAuthInfoBytes([pub], fee.amount, gasLimit, sequence);
    const txRaw = TxRaw.fromPartial({
      bodyBytes,
      authInfoBytes,
    });
    const newSerialized = toHex(TxRaw.encode(txRaw).finish());
    const signDoc = makeSignDoc(bodyBytes, authInfoBytes, network!.chainId!, params!.accountNumber!);
    const signBytes = makeSignBytes(signDoc);
    const message = toHex(sha256(signBytes));
    const signature = { pubKey: pubKeyHex, hash: message };
    return {
      serialized: newSerialized,
      signatures: [signature],
    };
  }

  async getReqProvider(provider: string): Promise<StargateClient> {
    return StargateClient.connect(provider);
  }

  async getReqAccount(client: StargateClient, address: string) {
    return client.getAccount(address);
  }

  async getChainId(client: StargateClient): Promise<string> {
    return client.getChainId();
  }
}

export const provider = new Provider();
