import { isNil, pick } from 'lodash';
import Web3 from 'web3';
import { toBN, toHex } from 'web3-utils';
import { utils } from 'ethers';
import { TransactionFactory, TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData, Capability } from '@ethereumjs/tx';
import { BN, stripHexPrefix, addHexPrefix, padToEven } from 'ethereumjs-util';

import { canonicalSignature } from '@src/utils/signature';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply } from '@src/__proto__/common/types';
import { TransactionParams } from '@src/__proto__/ethereum/common/types';
import {
  BuildTransactionRequest,
  DeployAccountRequest,
  BuildTransferTransactionRequest,
  BuildERC20TransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  RebuildTransactionRequest,
  HashForSignatureRequest,
  DecodeTransactionRequest,
  BuildContractTransactionRequest,
} from '@src/__proto__/ethereum/core/types';
import { pubToBIP55Address, compactPublicKey } from '../common/utils';
import { BaseProvider } from '../common/base';
import {
  BuildTransactionRequestSchema,
  EthereumRefSchema,
  DeployAccountRequestSchema,
  BuildTransferTransactionRequestSchema,
  BuildERC20TransferTransactionRequestSchema,
  SignTransactionRequestSchema,
  RebuildTransactionRequestSchema,
  SendTransactionRequestSchema,
  HashForSignatureRequestSchema,
  DecodeTransactionRequestSchema,
  BuildContractTransactionRequestSchema,
} from './ethereum.schema';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const validator = new Validator({ schemas: [EthereumRefSchema] });

export class Provider extends BaseProvider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key } = req as Required<DeployAccountRequest>;
    return pubToBIP55Address(key);
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferTransactionRequestSchema, req);

    const { from, to, quantity, network, params } = req as Required<BuildTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const txInput = {
      to,
      value: toBN(quantity),
    };
    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');

    const signature = { hash };
    const estimatedFee = this.getTxEstimatedFee(tx);

    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildERC20TransferTransaction(req: BuildERC20TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildERC20TransferTransactionRequestSchema, req);

    const { from, to, tokenAddress, quantity, network, params = {} } = req as Required<BuildERC20TransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = this.getWeb3Provider(provider!);

    const input = this.getERC20TransferInput(to, quantity);

    const txInput: FactoryTxData = {
      to: tokenAddress,
      data: input,
    };
    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');

    const signature = { hash };
    const estimatedFee = this.getTxEstimatedFee(tx);
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      estimatedFee,
    };
  }

  signTransaction(req: SignTransactionRequest) {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures, network } = req as Required<SignTransactionRequest>;
    const { chainId } = network!;

    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const txBuf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = TransactionFactory.fromSerializedData(txBuf, txOptions);
    const type = tx.type;
    const sign = stripHexPrefix(signatures[0].signature!);
    const { r, s, v } = canonicalSignature(sign!);
    const signedData = {
      ...tx.toJSON(),
      r: Buffer.from(padToEven(r), 'hex'),
      s: Buffer.from(padToEven(s), 'hex'),
      v: this.getChainIdVBN(v!, chainId!, type),
      type,
    };

    const signedTx = TransactionFactory.fromTxData(signedData, txOptions);
    const serializedTx = signedTx.serialize().toString('hex');
    const estimatedFee = this.getTxEstimatedFee(signedTx);
    return {
      serialized: serializedTx,
      hash: '0x' + signedTx.hash().toString('hex'),
      estimatedFee,
    };
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { params = {}, network, from, to, value, data } = req as Required<BuildTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const web3 = this.getWeb3Provider(provider!);
    const txOptions = { common };
    const txInput = {
      from,
      to,
      data,
      value: value ? toBN(value) : undefined,
    };

    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);

    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');
    const estimatedFee = this.getTxEstimatedFee(tx);

    const signature = { hash };
    return {
      serialized: reserialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async buildContractTransaction(req: BuildContractTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildContractTransactionRequestSchema, req);

    const { params = {}, network, from, abis, args, contractAddress, method, value } = req as Required<BuildContractTransactionRequest>;
    const { provider } = network!;
    const web3 = this.getWeb3Provider(provider!);
    const values = args.map((value) => (value.startsWith('[') && value.endsWith(']') ? JSON.parse(value) : value));
    const common = this.getTxCommon(network!);
    const iface = new utils.Interface(abis);
    const input = iface.encodeFunctionData(method, values);
    const txOptions = { common };
    const txInput = {
      to: contractAddress,
      data: input,
      value,
    };

    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);

    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');
    const estimatedFee = this.getTxEstimatedFee(tx);

    const signature = { hash };
    return {
      serialized: reserialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(RebuildTransactionRequestSchema, req);

    let { serialized, params = {}, network, from } = req as Required<RebuildTransactionRequest>;
    serialized = stripHexPrefix(serialized);
    const serializedBuf = Buffer.from(serialized, 'hex');
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const web3 = this.getWeb3Provider(provider!);
    const txOptions = { common };
    let tx = TransactionFactory.fromSerializedData(serializedBuf, txOptions);
    const type = tx.type;
    const { r, s, v, ...jsonTx } = tx.toJSON();

    let pubKey = '';
    if (tx.isSigned()) {
      const decompose = tx.getSenderPublicKey().toString('hex');
      pubKey = compactPublicKey(decompose);
    }

    let txData = {
      ...jsonTx,
      ...params,
      type,
    };

    if (!params?.gasPrice) {
      txData.gasPrice = await this.getReqGasPrice(web3);
    }

    if (!params?.gasLimit) {
      delete txData.gasLimit;
      txData.maxPriorityFeePerGas && delete txData.maxPriorityFeePerGas;
      txData.maxFeePerGas && delete txData.maxFeePerGas;
      if (!from && toBN(txData.value!).eqn(0) && !toBN(txData.data!).eqn(0)) {
        throw new AppError(errors.INVALID_ARGUMENT, { details: 'from is required' });
      }
      const txInput = {
        ...txData,
        from,
        nonce: toBN(txData.nonce!).toNumber(),
        chainId: txData.chainId ? toBN(txData.chainId).toNumber() : common.chainIdBN().toNumber(),
      };
      txData.gasLimit = await this.getReqGasLimit(web3, txInput);
    }

    if (tx.supports(Capability.EIP1559FeeMarket) && !(params?.maxFeePerGas && params?.maxPriorityFeePerGas)) {
      txData.maxPriorityFeePerGas && delete txData.maxPriorityFeePerGas;
      txData.maxFeePerGas && delete txData.maxFeePerGas;
      delete txData.gasPrice;
      txData = (await this.getReqEip155FeePerGas(web3, txData as FeeMarketEIP1559TxData)) as any;
    }

    tx = TransactionFactory.fromTxData(txData, txOptions);

    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');

    const signature = { hash, pubKey };
    const estimatedFee = this.getTxEstimatedFee(tx);
    return {
      serialized: reserialized,
      signatures: [signature],
      estimatedFee,
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider } = network!;
    const web3 = new Web3(provider!);
    const data = addHexPrefix(serialized);
    return new Promise((resolve, reject) => {
      web3.eth
        .sendSignedTransaction(data)
        .once('transactionHash', (hash) => {
          resolve({
            hash,
          });
        })
        .on('error', function (error) {
          reject(error);
        });
    });
  }

  hashForSignature(req: HashForSignatureRequest): TransactionReply {
    validator.assert(HashForSignatureRequestSchema, req);

    const { serialized, network } = req as Required<HashForSignatureRequest>;
    const common = this.getTxCommon(network!);

    const txOptions = { common };
    const buf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = TransactionFactory.fromSerializedData(buf, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = {
      hash,
    };
    const estimatedFee = this.getTxEstimatedFee(tx);
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      estimatedFee,
    };
  }

  decodeTransaction(req: DecodeTransactionRequest): TransactionParams {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized, network } = req as Required<DecodeTransactionRequest>;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const buf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = TransactionFactory.fromSerializedData(buf, txOptions);
    const params: TransactionParams = {
      type: addHexPrefix(padToEven(new BN(tx.type || 0).toString('hex'))),
      nonce: tx.nonce.toNumber(),
      gasLimit: addHexPrefix(tx.gasLimit.toString('hex')),
    };
    const opts = pick(tx, ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas']);
    Object.keys(opts).forEach((k) => {
      if (!isNil(opts[k])) {
        params[k] = toHex(toBN(opts[k]));
      }
    });
    return params;
  }
}

export const provider = new Provider();
