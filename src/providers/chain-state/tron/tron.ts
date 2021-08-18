import { isNil, pick } from 'lodash';
import TronWeb from 'tronweb';
import { pubToBase58Address } from './utils/address';
import { Validator } from '../../../utils/ajv';
import { AppError, errors } from './../../../error';

import {
  DeployAccountRequest,
  BuildTransferTransactionRequest,
  BuildTRC10TransferTransactionRequest,
  BuildTRC20TransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  TransactionParams,
  RebuildTransactionRequest,
} from '../../../__proto__/tron/types';
import { TransactionReply } from '../../../__proto__/common/TransactionReply';
import {
  TronRefSchema,
  DeployAccountRequestSchema,
  BuildTransferTransactionSchema,
  SignTransactionRequestSchema,
  BuildTRC10TransferTransactionSchema,
  BuildTRC20TransferTransactionSchema,
  SendTransactionRequestSchema,
  DecodeTransactionRequestSchema,
  RebuildTransactionRequestSchema,
} from './tron.schema';
import { encode, decode } from './utils/codec';

const validator = new Validator({ schemas: [TronRefSchema] });

export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);
    const { key } = req as Required<DeployAccountRequest>;
    return pubToBase58Address(key);
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferTransactionSchema, req);
    const { from, to, quantity, network, params = {} } = req as Required<BuildTransferTransactionRequest>;
    params!.extension = params?.extension || 60 * 10;
    const options = {};
    if (params?.permissionId) {
      options['permissionId'] = params.permissionId;
    }
    const tronWeb = this.getApi(network?.provider!);
    let unSignedTxn = await tronWeb.transactionBuilder.sendTrx(to, quantity, from, options);

    unSignedTxn = await this.alterTransaction(tronWeb, unSignedTxn, params!);

    const txid = unSignedTxn.txID;
    const serialized = encode(unSignedTxn);
    const signature = { hash: txid };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async buildTRC10TransferTransaction(req: BuildTRC10TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTRC10TransferTransactionSchema, req);
    const { from, to, quantity, network, tokenId, params = {} } = req as Required<BuildTRC10TransferTransactionRequest>;
    params!.extension = params?.extension || 60 * 10;
    const options = {};
    if (params?.permissionId) {
      options['permissionId'] = params.permissionId;
    }

    const tronWeb = this.getApi(network?.provider!);
    let unSignedTxn = await tronWeb.transactionBuilder.sendToken(to, quantity, tokenId, from, options);

    unSignedTxn = await this.alterTransaction(tronWeb, unSignedTxn, params!);

    const txid = unSignedTxn.txID;
    const serialized = encode(unSignedTxn);
    const signature = { hash: txid };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async buildTRC20TransferTransaction(req: BuildTRC20TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTRC20TransferTransactionSchema, req);
    const { from, to, quantity, network, contract, params = {} } = req as Required<BuildTRC20TransferTransactionRequest>;
    params!.extension = params?.extension || 60 * 10;

    const tronWeb = this.getApi(network?.provider!);
    const parameter = [
      { type: 'address', value: to },
      { type: 'uint256', value: quantity },
    ];
    const options = pick(params, ['feeLimit', 'callValue']);
    let { transaction: unSignedTxn, result } = await tronWeb.transactionBuilder.triggerSmartContract(
      contract,
      'transfer(address,uint256)',
      options,
      parameter,
      from, //
    );
    if (!result.result) throw new AppError(errors.MAKE_REQUEST_FAILED, { details: result });

    unSignedTxn = await this.alterTransaction(tronWeb, unSignedTxn, params!);

    const txid = unSignedTxn.txID;
    const serialized = encode(unSignedTxn);
    const signature = { hash: txid };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignTransactionRequestSchema, req);
    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const transaction = decode(serialized);
    let signature = signatures[0].signature;
    if (!Object.keys(transaction).length) throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid serialized hex' });

    if (Array.isArray(transaction.signature)) {
      if (!transaction.signature.includes(signature)) {
        transaction.signature.push(signature);
      }
    } else {
      transaction.signature = [signature];
    }
    const txid = transaction.txID;
    return {
      hash: txid,
      serialized: encode(transaction),
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);
    const { serialized, network } = req as Required<SendTransactionRequest>;
    const transaction = decode(serialized);
    if (!Object.keys(transaction).length) throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid serialized hex' });

    const tronweb = this.getApi(network?.provider!);
    const txid = transaction.txID;
    const { code } = await tronweb.trx.sendRawTransaction(transaction);
    if (code) {
      throw new AppError(errors.BROADCAST_FAILED, { details: code });
    }
    return {
      hash: txid,
    };
  }

  async decodeTransaction(req: DecodeTransactionRequest): Promise<TransactionParams> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeTransactionRequest>;
    const transaction = decode(serialized);
    const expiration = transaction?.raw_data?.expiration;
    const timestamp = transaction?.raw_data?.timestamp;
    const fee_limit = transaction?.raw_data?.fee_limit;
    const params: TransactionParams = {
      feeLimit: fee_limit,
      extension: Math.floor((expiration - timestamp) / 1000),
      expiration: Math.floor(expiration / 1000),
    };
    return params;
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(RebuildTransactionRequestSchema, req);

    const { network, serialized, params = {} } = req as Required<RebuildTransactionRequest>;
    const tronWeb = this.getApi(network?.provider!);

    const transaction = decode(serialized);
    delete transaction.signature;

    const tx = await this.alterTransaction(tronWeb, transaction, params!);
    const txid = tx.txID;
    const signature = { hash: txid };
    return {
      serialized: encode(tx),
      signatures: [signature],
    };
  }

  async alterTransaction(tronWeb: any, tx: any, params?: TransactionParams) {
    if (params?.extension) {
      tx.raw_data.timestamp = Date.now();
      tx.raw_data.expiration = tx.raw_data.timestamp + params.extension * 1000;
    }

    if (params?.feeLimit) {
      tx.raw_data.fee_limit = params.feeLimit;
    }

    const options = {};
    if (!isNil(params?.note)) {
      options['data'] = params?.note;
      options['dataFormat'] = 'utf8';
    }

    if (!(params?.extension || params?.feeLimit || !isNil(params?.note))) {
      return tx;
    }

    return tronWeb.transactionBuilder.alterTransaction(tx, options);
  }

  getApi(provider: string) {
    const tronWeb = new TronWeb(provider, provider, provider, '');
    return tronWeb;
  }
}

export const provider = new Provider();
