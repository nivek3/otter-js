import type { TransactionRequest } from '@ethersproject/abstract-provider';

import { isNil, pick } from 'lodash';
import { ContractFactory, utils, BigNumber, ethers, UnsignedTransaction } from 'ethers';
import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';

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
import { decodeRawTransaction, isEip1559 } from '../common/utils';
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

const validator = new Validator({ schemas: [EthereumRefSchema] });

export class Provider extends BaseProvider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key } = req as Required<DeployAccountRequest>;
    return ethers.utils.computeAddress(addHexPrefix(key));
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransferTransactionRequestSchema, req);

    const { from, to, quantity, network, params } = req as Required<BuildTransferTransactionRequest>;
    const provider = this.getReqProvider(network!);
    const txInput = {
      to,
      value: ethers.BigNumber.from(quantity).toString(),
    };
    return this.getTransactionReply(provider, txInput, from, params!, network!);
  }

  async buildERC20TransferTransaction(req: BuildERC20TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildERC20TransferTransactionRequestSchema, req);

    const { from, to, tokenAddress, quantity, network, params = {} } = req as Required<BuildERC20TransferTransactionRequest>;
    const provider = this.getReqProvider(network!);
    const input = this.encodeERC20Method('transfer', [to, quantity]);
    const txInput = {
      to: tokenAddress,
      data: input,
    };
    return this.getTransactionReply(provider, txInput, from, params!, network!);
  }

  signTransaction(req: SignTransactionRequest) {
    validator.assert(SignTransactionRequestSchema, req);
    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const { signatureHash, unsignedTransaction } = decodeRawTransaction(addHexPrefix(serialized));
    const invalid = signatures.some((sig) => stripHexPrefix(sig?.hash || '') !== stripHexPrefix(signatureHash));
    if (invalid) throw new AppError(errors.INVALID_ARGUMENT, { details: `Invalid signatures, expect hash to be ${signatureHash}` });

    const sign = stripHexPrefix(signatures[0].signature!);
    const { r, s, v } = canonicalSignature(sign!);
    const signature = ethers.utils.joinSignature({ r: addHexPrefix(r), s: addHexPrefix(s), recoveryParam: v });
    const serializedTx = ethers.utils.serializeTransaction(unsignedTransaction, signature);
    const hash = ethers.utils.keccak256(serializedTx);
    return {
      serialized: stripHexPrefix(serializedTx),
      hash,
      estimatedFee: this.getTxEstimatedFee(unsignedTransaction),
    };
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { params = {}, network, from, to, value, data } = req as Required<BuildTransactionRequest>;
    const provider = this.getReqProvider(network!);
    const txInput = {
      from,
      to,
      data: data ? addHexPrefix(data) : '0x',
      value: value ? ethers.BigNumber.from(value).toString() : undefined,
    };
    return this.getTransactionReply(provider, txInput, from, params!, network!);
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
    const provider = this.getReqProvider(network!);
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
    return this.getTransactionReply(provider, txInput, from, params!, network!);
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(RebuildTransactionRequestSchema, req);

    const { serialized, params = {}, network, from } = req as Required<RebuildTransactionRequest>;
    const provider = this.getReqProvider(network!);

    const { unsignedTransaction, recoveredPublicKey } = decodeRawTransaction(addHexPrefix(serialized));
    const txData = Object.assign({}, unsignedTransaction, {
      type: unsignedTransaction.type || undefined,
    });
    Object.keys(params!).reduce<UnsignedTransaction>((prev: UnsignedTransaction, key: string) => {
      if (params![key]) prev[key] = params![key];
      return prev;
    }, txData);

    if (params?.nonce) txData.nonce = ethers.BigNumber.from(params!.nonce).toNumber();

    if (!isEip1559(txData.type) && !params?.gasPrice) {
      params!.gasPrice = await this.getReqGasPrice(provider);
    } else if (isEip1559(txData.type) && !(params?.maxFeePerGas && params?.maxPriorityFeePerGas)) {
      txData.maxPriorityFeePerGas && delete txData.maxPriorityFeePerGas;
      txData.maxFeePerGas && delete txData.maxFeePerGas;
      delete txData.gasPrice;

      const populatedTxData = await this.populateEip1559TxData(provider, txData, params!, network!);
      Object.assign(txData, populatedTxData);
    }

    if (!params?.gasLimit) {
      delete txData.gasLimit;

      // txData.maxPriorityFeePerGas && delete txData.maxPriorityFeePerGas;
      // txData.maxFeePerGas && delete txData.maxFeePerGas;
      if (!from && ethers.BigNumber.from(txData.value!).eq(0) && !ethers.BigNumber.from(txData.data!).eq(0)) {
        throw new AppError(errors.INVALID_ARGUMENT, { details: 'from is required' });
      }
      const txInput = {
        ...txData,
        from,
      };
      txData.gasLimit = await this.getReqGasLimit(provider, txInput);
    }

    const reply = await this.getTransactionReply(provider, txData, from, params!, network!);
    const signatures = reply?.signatures || [];
    signatures[0].pubKey = recoveredPublicKey;
    return { ...reply, signatures };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const provider = this.getReqProvider(network!);
    const data = addHexPrefix(serialized);
    const { hash } = await provider.sendTransaction(data);
    return { hash };
  }

  hashForSignature(req: HashForSignatureRequest): TransactionReply {
    validator.assert(HashForSignatureRequestSchema, req);

    const { serialized } = req as Required<HashForSignatureRequest>;
    const { unsignedSerialized, unsignedTransaction } = decodeRawTransaction(addHexPrefix(serialized));
    const signature = ethers.utils.keccak256(unsignedSerialized);
    const estimatedFee = this.getTxEstimatedFee(unsignedTransaction);

    return {
      serialized: stripHexPrefix(unsignedSerialized),
      signatures: [{ hash: stripHexPrefix(signature) }],
      estimatedFee,
    };
  }

  decodeTransaction(req: DecodeTransactionRequest): TransactionParams {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeTransactionRequest>;
    const { unsignedTransaction } = decodeRawTransaction(addHexPrefix(serialized));
    const params: TransactionParams = {
      type: unsignedTransaction.type?.toString(),
      nonce: unsignedTransaction.nonce?.toString(),
      gasLimit: unsignedTransaction.gasLimit ? ethers.BigNumber.from(unsignedTransaction.gasLimit!).toHexString() : undefined,
    };
    const opts = pick(unsignedTransaction, ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas']);
    Object.keys(opts).forEach((k) => {
      if (!isNil(opts[k])) {
        params[k] = BigNumber.from(opts[k]).toHexString();
      }
    });
    return params;
  }

  async decodeRawTransaction(req: DecodeRawTransactionRequest): Promise<DecodeRawTransactionReply> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized } = req as Required<DecodeRawTransactionRequest>;
    const tx = utils.parseTransaction(addHexPrefix(serialized));
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

  async getFeeData(req: GetFeeDataRequest): Promise<GetFeeDataReply> {
    const { network } = req as Required<GetFeeDataRequest>;
    const provider = this.getReqProvider(network!);
    const txData = {};
    const [fee, gasPrice] = await Promise.all([
      this.getEip1559TxFeeData(provider, txData, network!), // fallback to eip1559
      provider.getGasPrice(), // fallback to legacy gasPrice
    ]);
    return {
      maxFeePerGas: fee.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas?.toString(),
      gasPrice: gasPrice.toString(),
    };
  }

  async getTransactionReply(
    provider: ethers.providers.BaseProvider,
    txInput: TransactionRequest,
    from?: string,
    params?: TransactionParams,
    network?: Network,
  ): Promise<TransactionReply> {
    const unsignedTransaction = await this.getTxData(provider, txInput, from, params, network);

    const serializeTransaction = ethers.utils.serializeTransaction(unsignedTransaction);
    const hashForSignature = ethers.utils.keccak256(serializeTransaction);

    const estimatedFee = this.getTxEstimatedFee(unsignedTransaction);
    const signature = { hash: stripHexPrefix(hashForSignature) };
    return {
      serialized: stripHexPrefix(serializeTransaction),
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
