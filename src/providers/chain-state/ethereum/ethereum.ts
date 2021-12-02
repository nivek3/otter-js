import { isNil, pick } from 'lodash';
import Web3 from 'web3';
import { toBN, toHex } from 'web3-utils';
import type { TransactionConfig } from 'web3-core';
import { TransactionFactory, TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData } from '@ethereumjs/tx';
import ABI from 'ethereumjs-abi';
import Common from '@ethereumjs/common';
import {
  BN,
  bufferToHex,
  generateAddress,
  toChecksumAddress,
  Address,
  stripHexPrefix,
  addHexPrefix,
  padToEven,
  bnToHex,
} from 'ethereumjs-util';
import { canonicalSignature } from '../../../utils/signature';
import { Validator } from '../../../utils/ajv';
import { errors, AppError } from '../../../error';

import { TransactionReply, Signature } from '../../../__proto__/common/types';
import {
  Network,
  BuildTransactionRequest,
  TransactionParams,
  DeployAccountRequest,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferTransactionRequest,
  BuildERC20TransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  RebuildTransactionRequest,
  BuildMultisigTransferInputRequest,
  SignMultisigTransferInputRequest,
  BuildMultisigTransferTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
  HashForSignatureRequest,
  DecodeTransactionRequest,
} from '../../../__proto__/ethereum/types';
import { pubToBIP55Address, compactPublicKey, isBip1559Transaction } from './utils';

import {
  BuildTransactionRequestSchema,
  EthereumRefSchema,
  DeployAccountRequestSchema,
  BuildAccountTransactionRequestSchema,
  BuildTransferTransactionRequestSchema,
  BuildERC20TransferTransactionRequestSchema,
  SignTransactionRequestSchema,
  RebuildTransactionRequestSchema,
  SendTransactionRequestSchema,
  SignMultisigTransferInputRequestSchema,
  BuildMultisigTransferInputRequestSchema,
  BuildMultisigERC20TransferInputRequestSchema,
  SignMultisigERC20TransferInputRequestSchema,
  HashForSignatureRequestSchema,
  DecodeTransactionRequestSchema,
  BuildMultisigTransferTransactionRequestSchema,
} from './ethereum.schema';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const Web3Method = require('web3-core-method');
const abiDecoder = require('abi-decoder');
const Contract = require('web3-eth-contract');
const abi = require('./abis/multisig');
const bytecode = require('./bytecodes/multisig');
const contract = new Contract(abi);
abiDecoder.addABI(abi);

const validator = new Validator({ schemas: [EthereumRefSchema] });
export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key } = req as Required<DeployAccountRequest>;
    return pubToBIP55Address(key);
  }

  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
    validator.assert(BuildAccountTransactionRequestSchema, req);

    const { keys, sender, network, params } = req as Required<BuildAccountTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };

    const web3 = new Web3(provider!);
    const addresses = keys.map(pubToBIP55Address);
    const input = contract
      .deploy({
        data: bytecode,
        arguments: [addresses],
      })
      .encodeABI();

    const txInput = {
      data: input,
    };
    const txData = await this.getTxData(txInput, common, params!, web3, sender);
    const tx = TransactionFactory.fromTxData(txData, txOptions);

    const from = Address.fromString(sender).toBuffer();
    const address = toChecksumAddress(bufferToHex(generateAddress(from, new BN(txData.nonce!).toBuffer())));
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      address,
    };
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
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  async buildERC20TransferTransaction(req: BuildERC20TransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildERC20TransferTransactionRequestSchema, req);

    const { from, to, tokenAddress, quantity, network, params = {} } = req as Required<BuildERC20TransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = this.getWeb3Provider(provider!);

    const raw = '0000000000000000000000000000000000000000000000000000000000000000';
    const amount = stripHexPrefix(toHex(toBN(quantity)));
    const input =
      '0xa9059cbb000000000000000000000000' + // token transfer method
      stripHexPrefix(to) + // to address
      raw.substring(0, raw.length - amount.length) + // placeholder
      amount; // amount

    const txInput: FactoryTxData = {
      to: tokenAddress,
      data: input,
    };
    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');

    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
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
    const sign = stripHexPrefix(signatures[0].signature!);
    const { r, s, v } = canonicalSignature(sign!);
    const type = this.getTxType(txBuf);
    const signedData = {
      ...tx.toJSON(),
      r: Buffer.from(padToEven(r), 'hex'),
      s: Buffer.from(padToEven(s), 'hex'),
      v: this.getChainIdVBN(v!, chainId!, type),
      type,
    };

    const signedTx = TransactionFactory.fromTxData(signedData, txOptions);
    const serializedTx = signedTx.serialize().toString('hex');
    return {
      serialized: serializedTx,
      hash: '0x' + signedTx.hash().toString('hex'),
    };
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { params = {}, network, from, to, quantity, data } = req as Required<BuildTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const web3 = this.getWeb3Provider(provider!);
    const txOptions = { common };
    const txInput = {
      from,
      to,
      data,
      value: toBN(quantity),
    };

    const txData = await this.getTxData(txInput, common, params!, web3, from);
    const tx = TransactionFactory.fromTxData(txData, txOptions);

    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');

    const signature = { hash };
    return {
      serialized: reserialized,
      signatures: [signature],
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
    const type = this.getTxType(serializedBuf);
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

    if (isBip1559Transaction(txData?.type) && !(params?.maxFeePerGas && params?.maxPriorityFeePerGas)) {
      txData.maxPriorityFeePerGas && delete txData.maxPriorityFeePerGas;
      txData.maxFeePerGas && delete txData.maxFeePerGas;
      delete txData.gasPrice;
      txData = (await this.getReqEip155FeePerGas(web3, txData as FeeMarketEIP1559TxData)) as any;
    }

    tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');

    const signature = { hash, pubKey };
    return {
      serialized: reserialized,
      signatures: [signature],
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

  async buildMultisigTransferInput(req: BuildMultisigTransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferInputRequestSchema, req);

    const { toAddress, quantity, network } = req as Required<BuildMultisigTransferInputRequest>;

    const sequenceId = await this.getReqSequenceId(network?.provider, req?.contract, req?.sequenceId);
    const prefix = 'ETHER';
    const expireTime = req.expireTime || Math.ceil(new Date().getTime() / 1000) + 600;
    const data = req.data || '';
    const hash = this.getSha3ForConfirmationTx(
      prefix,
      toAddress,
      quantity,
      data,
      expireTime, //
      sequenceId,
    );
    const input = contract.methods.sendMultiSig(toAddress, quantity, data || '0x', expireTime, sequenceId, '0x').encodeABI();
    const signature: Signature = {
      hash: hash.toString('hex'),
    };
    return {
      serialized: stripHexPrefix(input),
      signatures: [signature],
    };
  }

  signMultisigTransferInput(req: SignMultisigTransferInputRequest): TransactionReply {
    validator.assert(SignMultisigTransferInputRequestSchema, req);
    const { serialized, signatures } = req as Required<SignMultisigTransferInputRequest>;
    const input = this.signSendMultiSigInput(serialized, signatures[0].signature!);

    return {
      serialized: stripHexPrefix(input),
    };
  }

  signSendMultiSigInput(serialized: string, signature: string): string {
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSig') throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid hash' });
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, data, expireTime, sequenceId } = params;
    return contract.methods.sendMultiSig(toAddress, quantity, data || '0x', expireTime, sequenceId, addHexPrefix(signature!)).encodeABI();
  }

  signSendMultiSigTokenInput(serialized: string, signature: string): string {
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSigToken') throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid hash' });
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, tokenContractAddress, expireTime, sequenceId } = params;
    return contract.methods
      .sendMultiSigToken(toAddress, quantity, tokenContractAddress, expireTime, sequenceId, addHexPrefix(signature!))
      .encodeABI();
  }

  async buildMultisigTransferTransaction(req: BuildMultisigTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferTransactionRequestSchema, req);

    const { network, contract, sender, params } = req as Required<BuildMultisigTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const input = stripHexPrefix(this.getReqInput(req));

    const data = addHexPrefix(input);
    const txInput: FactoryTxData = {
      to: contract,
      data,
    };

    const txData = await this.getTxData(txInput, common, params!, web3, sender);
    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  getReqInput(req: Pick<BuildMultisigTransferTransactionRequest, 'serialized' | 'signatures' | 'data'>): string {
    const { serialized, signatures, data } = req;
    if (data) return data;

    const signature = signatures?.[0]?.signature;
    if (!(signature && serialized)) throw new AppError(errors.INVALID_ARGUMENT, { details: 'required input and signature' });
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name === 'sendMultiSigToken') return this.signSendMultiSigTokenInput(serialized, signature);
    if (decodedData?.name === 'sendMultiSig') return this.signSendMultiSigInput(serialized, signature);

    throw new AppError(errors.INVALID_ARGUMENT, { details: `can not decode the hex, decode name = ${decodedData?.name}` });
  }

  async buildMultisigERC20TransferInput(req: BuildMultisigERC20TransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigERC20TransferInputRequestSchema, req);

    const { toAddress, quantity, tokenAddress, network } = req as Required<BuildMultisigERC20TransferInputRequest>;
    const sequenceId = await this.getReqSequenceId(network?.provider, req.contract, req.sequenceId);

    const expireTime = req.expireTime || Math.ceil(new Date().getTime() / 1000) + 600;
    const hash = this.getSha3ForConfirmationTokenTx(
      'ERC20',
      toAddress,
      quantity,
      tokenAddress,
      expireTime, //
      sequenceId,
    );
    const input = contract.methods.sendMultiSigToken(toAddress, quantity, tokenAddress, expireTime, sequenceId, '0x').encodeABI();
    const signature: Signature = {
      hash: hash.toString('hex'),
    };
    return {
      serialized: stripHexPrefix(input),
      signatures: [signature],
    };
  }

  signMultisigERC20TransferInput(req: SignMultisigERC20TransferInputRequest): TransactionReply {
    validator.assert(SignMultisigERC20TransferInputRequestSchema, req);

    const { serialized, signatures } = req as Required<SignMultisigERC20TransferInputRequest>;
    const input = this.signSendMultiSigTokenInput(serialized, signatures[0].signature!);

    return {
      serialized: stripHexPrefix(input),
    };
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
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
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

  private getTxCommon(network: Network) {
    let common: Common;
    const chainId = network.chainId;
    if (Common.isSupportedChainId(new BN(chainId!))) {
      common = new Common({ chain: chainId! });
    } else {
      common = new Common({ chain: 'kovan' });
      common.setChain({
        genesis: common.genesis(),
        hardforks: common.hardforks(),
        bootstrapNodes: common.bootstrapNodes(),
        chainId,
        networkId: chainId,
        ...network,
      });
    }
    if (network?.hardFork) {
      common.setHardfork(network?.hardFork);
    }
    return common;
  }

  private async getReqNonce(address: string, web3: Web3, nonce?: number) {
    if (nonce === undefined) {
      nonce = await web3.eth.getTransactionCount(address, 'pending');
    }
    return nonce;
  }

  private async getReqSequenceId(provider?: string, address?: string, sequenceId?: number) {
    if (sequenceId === undefined) {
      if (!provider || !address) throw new AppError(errors.INVALID_ARGUMENT);
      const web3 = new Web3(provider);
      sequenceId = toBN(
        await web3.eth.call({
          to: address,
          data: '0xa0b7967b',
        }),
      ).toNumber();
    }
    return sequenceId;
  }

  private async getReqGasPrice(web3: Web3, gasPrice?: string) {
    if (!gasPrice) {
      gasPrice = await web3.eth.getGasPrice();
    }
    return gasPrice;
  }

  private async getReqGasLimit(web3: Web3, tx: TransactionConfig, gasLimit?: string) {
    if (!gasLimit) {
      const estimateGas = await web3.eth.estimateGas(tx);
      gasLimit = toHex(toBN(estimateGas));
    }
    return gasLimit;
  }

  private async getReqEip155FeePerGas(web3: Web3, tx: FeeMarketEIP1559TxData): Promise<FactoryTxData> {
    if (tx['maxFeePerGas'] && tx['maxPriorityFeePerGas']) {
      return tx;
    }
    const block = await web3.eth.getBlock('latest');
    const baseFeePerGas = block['baseFeePerGas']!;

    if (!tx.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = await this.maxPriorityFeePerGas(web3);
    }
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas as string;
    const maxFeePerGas = toHex(toBN(baseFeePerGas).mul(toBN(2)).add(toBN(maxPriorityFeePerGas)));
    return Object.assign(tx, {
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  private getSha3ForConfirmationTx(
    prefix: string,
    toAddress: string,
    quantity: string,
    data: string,
    expireTime: number,
    sequenceId: number,
  ) {
    return ABI.soliditySHA3(
      ['string', 'address', 'uint', 'string', 'uint', 'uint'], // argTypes
      [prefix, new BN(toAddress.replace('0x', ''), 16), quantity, data, expireTime, sequenceId],
    );
  }

  private getSha3ForConfirmationTokenTx(
    prefix: string,
    toAddress: string,
    value: string,
    tokenContractAddress: string,
    expireTime: number,
    sequenceId: number,
  ) {
    return ABI.soliditySHA3(
      ['string', 'address', 'uint', 'address', 'uint', 'uint'], //
      [prefix, new BN(toAddress.replace('0x', ''), 16), value, new BN(tokenContractAddress.replace('0x', ''), 16), expireTime, sequenceId],
    );
  }

  private getChainIdVBN(v: number, chainId: number, type?: number) {
    const vBN = new BN(v);
    switch (type) {
      case 1:
      case 2:
        return vBN;
      default:
        break;
    }
    const chainIdBN = new BN(chainId!);
    vBN.iadd(chainIdBN.muln(2).addn(8 + 27));
    return vBN;
  }

  getWeb3Provider(provider: string): Web3 {
    return new Web3(provider!);
  }

  getTxType(tx: Buffer) {
    return tx[0] <= 0x7f ? tx[0] : undefined;
  }

  async getTxData(tx: FactoryTxData, common: Common, params: TransactionParams, web3: Web3, from: string): Promise<FactoryTxData> {
    tx.data = tx.data || '0x';
    tx.value = tx.value || '0x00';
    const { to, value, data } = tx;
    const nonce = await this.getReqNonce(from, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from,
        to,
        gasPrice,
        nonce,
        common,
        data,
        value,
      } as any,
      params?.gasLimit,
    );
    let txData = {
      to,
      nonce: new BN(nonce).toNumber(),
      gasPrice: gasPrice ? bnToHex(toBN(gasPrice)) : undefined,
      gasLimit: bnToHex(toBN(gasLimit)),
      type: params?.type,
      ...tx,
    };
    // eip1559
    if (isBip1559Transaction(txData?.type)) {
      delete txData.gasPrice;
      const newData = await this.getReqEip155FeePerGas(web3, txData as FeeMarketEIP1559TxData);
      Object.assign(txData, newData);
    }
    return txData;
  }

  async maxPriorityFeePerGas(web3: Web3): Promise<string> {
    // const MethodFn: any = Method;
    web3.eth.extend({
      methods: [
        new Web3Method({
          name: 'maxPriorityFeePerGas',
          call: 'eth_maxPriorityFeePerGas',
        }),
      ],
    });
    return web3.eth['maxPriorityFeePerGas']();
  }
}

export const provider = new Provider();
