import { isNil, pick } from 'lodash';
import Web3 from 'web3';
import { toBN, toHex } from 'web3-utils';
import { ContractFactory, utils, BigNumber } from 'ethers';
import { TransactionFactory, TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData, Capability, TxOptions } from '@ethereumjs/tx';
import { BN, stripHexPrefix, addHexPrefix, padToEven, toBuffer } from 'ethereumjs-util';

import { canonicalSignature } from '@src/utils/signature';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply } from '@src/__proto__/common/types';
import { TransactionParams, Network } from '@src/__proto__/ethereum/common/types';
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
  BuildContractExecutionTransactionInputRequest,
  BuildContractExecutionTransactionInputReply,
  BuildContractCreationTransactionInputRequest,
  BuildContractCreationTransactionInputReply,
  BuildContractTransactionRequest,
  DecodeRawTransactionRequest,
  DecodeRawTransactionReply,
  GetFeeDataRequest,
  GetFeeDataReply,
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
  BuildContractExecutionTransactionInputRequestSchema,
  BuildContractCreationTransactionInputRequestSchema,
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
    return this.getTransactionReply(txInput, txOptions, web3, from, params!, network!);
  }

  async buildERC20TransferTransaction(req: BuildERC20TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildERC20TransferTransactionRequestSchema, req);

    const { from, to, tokenAddress, quantity, network, params = {} } = req as Required<BuildERC20TransferTransactionRequest>;
    const { provider } = network!;
    const txOptions = this.getTxOptions(network!);
    const web3 = this.getWeb3Provider(provider!);

    const input = this.encodeERC20Method('transfer', [to, quantity]);
    const txInput: FactoryTxData = {
      to: tokenAddress,
      data: input,
    };
    return this.getTransactionReply(txInput, txOptions, web3, from, params!, network!);
  }

  signTransaction(req: SignTransactionRequest) {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, signatures, network } = req as Required<SignTransactionRequest>;
    const { chainId } = network!;

    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const txBuffer = toBuffer(addHexPrefix(serialized));
    const tx = TransactionFactory.fromSerializedData(txBuffer, txOptions);
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
    const txOptions = this.getTxOptions(network!);
    const web3 = this.getWeb3Provider(provider!);
    const txInput = {
      from,
      to,
      data: data ? addHexPrefix(data) : '0x',
      value: value ? toBN(value) : undefined,
    };
    return this.getTransactionReply(txInput, txOptions, web3, from, params!, network!);
  }

  async buildContractExecutionTransactionInput(
    req: BuildContractExecutionTransactionInputRequest,
  ): Promise<BuildContractExecutionTransactionInputReply> {
    validator.assert(BuildContractExecutionTransactionInputRequestSchema, req);
    const { abi, method } = req as Required<BuildContractExecutionTransactionInputRequest>;
    const values = this.getReqArgs(req.args);
    const iface = new utils.Interface(abi);
    const input = iface.encodeFunctionData(method, values);
    return { data: stripHexPrefix(input) };
  }

  async buildContractCreationTransactionInput(
    req: BuildContractCreationTransactionInputRequest,
  ): Promise<BuildContractCreationTransactionInputReply> {
    validator.assert(BuildContractCreationTransactionInputRequestSchema, req);

    const { abi, bytecode } = req as Required<BuildContractCreationTransactionInputRequest>;
    const values = this.getReqArgs(req.args);
    const iface = new utils.Interface(abi);
    const contract = new ContractFactory(iface, addHexPrefix(bytecode));
    const { data } = contract.getDeployTransaction(...values);
    if (!data) throw new AppError(errors.INTERNAL, { details: 'Failed to deploy contract' });
    return { data: stripHexPrefix(utils.hexlify(data)) };
  }

  async buildContractTransaction(req: BuildContractTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildContractTransactionRequestSchema, req);

    const { params = {}, network, from, abi, args, contractAddress, method, value } = req as Required<BuildContractTransactionRequest>;
    const { provider } = network!;
    const web3 = this.getWeb3Provider(provider!);
    const txOptions = this.getTxOptions(network!);
    const { data: input } = await this.buildContractExecutionTransactionInput({
      abi,
      args,
      method,
    });
    const txInput = {
      to: contractAddress,
      data: addHexPrefix(input!),
      value,
    };

    return this.getTransactionReply(txInput, txOptions, web3, from, params!, network!);
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
    const tx = TransactionFactory.fromSerializedData(serializedBuf, txOptions);
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
    if (params?.nonce) txData.nonce = toHex(toBN(params!.nonce));
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
      const newData = await this.getFeeMarketEIP1559TxData(web3, txData as FeeMarketEIP1559TxData, params!, network!);
      Object.assign(txData, newData);
    }

    const reply = await this.getTransactionReply(txData, txOptions, web3, from, params!, network!);
    const signatures = reply?.signatures || [];
    signatures[0].pubKey = pubKey;
    return { ...reply, signatures };
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
    const txOptions = this.getTxOptions(network!);
    const buf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = TransactionFactory.fromSerializedData(buf, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
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
    const txOptions = this.getTxOptions(network!);
    const data = toBuffer(addHexPrefix(serialized));
    const tx = TransactionFactory.fromSerializedData(data, txOptions);
    const params: TransactionParams = {
      type: addHexPrefix(padToEven(new BN(tx.type || 0).toString('hex'))),
      nonce: tx.nonce.toString(),
      gasLimit: addHexPrefix(tx.gasLimit.toString('hex')),
    };
    const opts = pick(tx, ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas']);
    Object.keys(opts).forEach((k) => {
      if (!isNil(opts[k])) {
        params[k] = BigNumber.from(toHex(opts[k])).toHexString();
      }
    });
    return params;
  }

  async decodeRawTransaction(req: DecodeRawTransactionRequest): Promise<DecodeRawTransactionReply> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeRawTransactionRequest>;
    const tx = utils.parseTransaction(toBuffer(addHexPrefix(serialized)));
    const decoded: DecodeRawTransactionReply = {
      nonce: BigNumber.from(tx.nonce).toHexString(),
      to: tx.to?.toString(),
      data: tx.data?.toString(),
      value: tx.value?.toHexString(),
      gasPrice: tx.gasPrice?.toHexString(),
      gasLimit: tx.gasLimit?.toHexString(),
      maxFeePerGas: tx.maxFeePerGas?.toHexString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toHexString(),
      r: tx.r,
      s: tx.s,
      accessList: tx.accessList,
      from: tx.from,
    };
    if (!isNil(tx.v)) decoded.v = BigNumber.from(tx.v).toHexString();
    if (!isNil(tx.type)) decoded.type = BigNumber.from(tx.type).toHexString();
    if (!isNil(tx.chainId)) decoded.chainId = BigNumber.from(tx.chainId).toHexString();
    return decoded;
  }

  async _decodeRawTransaction(req: DecodeRawTransactionRequest): Promise<DecodeRawTransactionReply> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeRawTransactionRequest>;
    const tx = TransactionFactory.fromSerializedData(toBuffer(addHexPrefix(serialized)));
    const jsonTx = tx.toJSON();
    jsonTx.type = tx.type.toString();
    return jsonTx;
  }

  async getFeeData(req: GetFeeDataRequest): Promise<GetFeeDataReply> {
    const { network } = req as Required<GetFeeDataRequest>;
    const web3 = new Web3(network!.provider!);
    const txData: FeeMarketEIP1559TxData = {};
    const [fee, gasPrice] = await Promise.all([
      this.getTxFeeData(web3, txData, network!), // fallback to eip1559
      web3.eth.getGasPrice(), // fallback to legacy gasPrice
    ]);
    return Object.assign(fee, { gasPrice: toHex(gasPrice) });
  }

  async getTransactionReply(
    txInput: FactoryTxData,
    txOptions: TxOptions,
    web3: Web3,
    from?: string,
    params?: TransactionParams,
    network?: Network,
  ): Promise<TransactionReply> {
    const txData = await this.getTxData(web3, txInput, from, params, network);
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

  getReqArgs(args?: string) {
    try {
      if (!args) return [];
      const value = JSON.parse(args);
      if (!Array.isArray(value)) throw new AppError(errors.INVALID_ARGUMENT, { details: `invalid args ${args}` });
      return value;
    } catch (e) {
      throw new AppError(errors.INVALID_ARGUMENT, { details: `invalid args ${args}` });
    }
  }
}

export const provider = new Provider();
