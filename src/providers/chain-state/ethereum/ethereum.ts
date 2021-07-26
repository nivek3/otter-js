import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { Transaction } from '@ethereumjs/tx';
import ABI from 'ethereumjs-abi';
import Common from '@ethereumjs/common';
import { BN, bufferToHex, generateAddress, toChecksumAddress, Address, stripHexPrefix, addHexPrefix } from 'ethereumjs-util';
import { parseSignature } from '../../../utils/signature';

import { TransactionReply, Signature } from '../../../__proto__/common/types';
import {
  Network,
  TransactionParams,
  DeployAccountRequest,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferTransactionRequest,
  BuildTokenTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  RebuildTransactionRequest,
  BuildMultisigTransferInputRequest,
  SignMultisigTransferInputRequest,
  BuildMultisigTransferTransactionRequest,
  BuildMultisigTokenTransferInputRequest,
  SignMultisigTokenTransferInputRequest,
  HashForSignatureRequest,
} from '../../../__proto__/ethereum/types';
import { pubToBIP55Address, compactPublicKey } from './utils';

const abiDecoder = require('abi-decoder');
const Contract = require('web3-eth-contract');
const abi = require('./abis/multisig');
const bytecode = require('./bytecodes/multisig');
const contract = new Contract(abi);
abiDecoder.addABI(abi);

export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    const { key } = req as Required<DeployAccountRequest>;
    return pubToBIP55Address(key);
  }

  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
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

    const nonce = await this.getReqNonce(sender, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from: sender,
        gasPrice,
        nonce,
        data: input,
      },
      params?.gasLimit,
    );

    const txData = {
      nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
      gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
      gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
      data: input,
    };
    const tx = Transaction.fromTxData(txData, txOptions);
    const from = Address.fromString(sender).toBuffer();
    const address = toChecksumAddress(bufferToHex(generateAddress(from, new BN(nonce!).toBuffer())));
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      address,
    };
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, params } = req as Required<BuildTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);

    const nonce = await this.getReqNonce(from, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from,
        to,
        value: quantity,
        gasPrice,
        nonce,
      },
      params?.gasLimit,
    );

    const txData = {
      from,
      to,
      value: new BN(quantity).toBuffer(),
      nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
      gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
      gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
    };
    const tx = Transaction.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  async buildTokenTransferTransaction(req: BuildTokenTransferTransactionRequest): Promise<TransactionReply> {
    const { from, to, tokenAddress, quantity, network, params } = req as Required<BuildTokenTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);

    const raw = '0000000000000000000000000000000000000000000000000000000000000000';
    const amount = new BigNumber(quantity).toString(16);
    const input =
      '0xa9059cbb000000000000000000000000' + // token transfer method
      stripHexPrefix(to) + // to address
      raw.substring(0, raw.length - amount.length) + // placeholder
      amount; // amount

    const nonce = await this.getReqNonce(from, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from,
        to: tokenAddress,
        data: input,
        gasPrice,
        nonce,
      },
      params?.gasLimit,
    );

    const txData = {
      from,
      to: tokenAddress,
      data: input,
      value: '0x00',
      nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
      gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
      gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
    };
    const tx = Transaction.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  signTransaction(req: SignTransactionRequest) {
    const { serialized, signatures, network } = req as Required<SignTransactionRequest>;
    const { chainId } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const tx = Transaction.fromSerializedTx(Buffer.from(serialized, 'hex'), txOptions);
    const sign = signatures[0].signature;
    const { r, s, v } = parseSignature(sign!);
    const signedData = {
      ...tx.toJSON(),
      r: Buffer.from(r!, 'hex'),
      s: Buffer.from(s!, 'hex'),
      v: this.getChainIdVBN(v!, chainId!),
    };

    const signedTx = Transaction.fromTxData(signedData, txOptions);
    const serializedTx = signedTx.serialize().toString('hex');
    return {
      serialized: serializedTx,
      hash: '0x' + signedTx.hash().toString('hex'),
    };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    const { serialized, params = {}, network } = req as Required<RebuildTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const web3 = new Web3(provider!);
    const txOptions = { common };
    let tx = Transaction.fromSerializedTx(Buffer.from(serialized, 'hex'), txOptions);
    const { r, s, v, ...jsonTx } = tx.toJSON();

    let pubKey = '';
    if (tx.isSigned()) {
      const decompose = tx.getSenderPublicKey().toString('hex');
      pubKey = compactPublicKey(decompose);
    }

    const txData = {
      ...jsonTx,
      ...params,
    };

    if (params?.nonce !== undefined) {
      const nonce = '0x' + new BigNumber(params.nonce).toString(16);
      txData.nonce = nonce;
    }

    if (!params?.gasPrice) {
      const gasPrice = await this.getReqGasPrice(web3);
      txData.gasPrice = '0x' + new BigNumber(gasPrice).toString(16);
    }

    if (!params?.gasLimit) {
      delete txData.gasLimit;
      const rebuildTx = {
        ...txData,
      };
      const gasLimit = await this.getReqGasLimit(web3, rebuildTx);
      txData.gasLimit = '0x' + new BigNumber(gasLimit).toString(16);
    }

    tx = Transaction.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const reserialized = tx.serialize().toString('hex');

    const signature = { hash, pubKey };
    return {
      serialized: reserialized,
      signatures: [signature],
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
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

  buildMultisigTransferInput(req: BuildMultisigTransferInputRequest): TransactionReply {
    const { toAddress, quantity, sequenceId } = req as Required<BuildMultisigTransferInputRequest>;
    if (!(sequenceId > 0)) {
      throw new Error('sequenceId should be positive integer');
    }
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
    const { serialized, signatures } = req as Required<SignMultisigTransferInputRequest>;
    const { signature } = signatures[0];
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSig') throw new Error('invalid hash');
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, data, expireTime, sequenceId } = params;
    const input = contract.methods
      .sendMultiSig(toAddress, quantity, data || '0x', expireTime, sequenceId, addHexPrefix(signature!))
      .encodeABI();
    return {
      serialized: stripHexPrefix(input),
    };
  }

  async buildMultisigTransferTransaction(req: BuildMultisigTransferTransactionRequest): Promise<TransactionReply> {
    const { network, contract, input, sender, params } = req as Required<BuildMultisigTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const data = addHexPrefix(input);
    const nonce = await this.getReqNonce(sender, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from: sender,
        to: contract,
        data,
        gasPrice,
        nonce,
      },
      params?.gasLimit,
    );

    const txData = {
      data,
      value: '0x00',
      to: contract,
      nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
      gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
      gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
    };
    const tx = Transaction.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = { hash };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  buildMultisigTokenTransferInput(req: BuildMultisigTokenTransferInputRequest): TransactionReply {
    const { toAddress, quantity, sequenceId, tokenAddress } = req as Required<BuildMultisigTokenTransferInputRequest>;
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

  signMultisigTokenTransferInput(req: SignMultisigTokenTransferInputRequest): TransactionReply {
    const { serialized, signatures } = req as Required<SignMultisigTokenTransferInputRequest>;
    const { signature } = signatures[0];
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSigToken') throw new Error('invalid hash');
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, tokenContractAddress, expireTime, sequenceId } = params;
    const input = contract.methods
      .sendMultiSigToken(toAddress, quantity, tokenContractAddress, expireTime, sequenceId, addHexPrefix(signature!))
      .encodeABI();
    return {
      serialized: stripHexPrefix(input),
    };
  }

  hashForSignature(req: HashForSignatureRequest): TransactionReply {
    const { serialized, network } = req as Required<HashForSignatureRequest>;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const buf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = Transaction.fromSerializedTx(buf, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');
    const signature = {
      hash,
    };
    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
    };
  }

  decodeTransaction(req: HashForSignatureRequest): TransactionParams {
    const { serialized, network } = req as Required<HashForSignatureRequest>;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const buf = Buffer.from(stripHexPrefix(serialized), 'hex');
    const tx = Transaction.fromSerializedTx(buf, txOptions);
    const params: TransactionParams = {
      nonce: tx.nonce.toNumber(),
      gasPrice: addHexPrefix(tx.gasPrice.toString('hex')),
      gasLimit: addHexPrefix(tx.gasLimit.toString('hex')),
    };
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
    return common;
  }

  private async getReqNonce(address: string, web3: Web3, nonce?: number) {
    if (nonce === undefined) {
      nonce = await web3.eth.getTransactionCount(address);
    }
    return nonce;
  }

  private async getReqGasPrice(web3: Web3, gasPrice?: string) {
    if (!gasPrice) {
      gasPrice = await web3.eth.getGasPrice();
    }
    return gasPrice;
  }

  private async getReqGasLimit(web3: Web3, tx: object, gasLimit?: string) {
    if (!gasLimit) {
      const estimateGas = await web3.eth.estimateGas(tx);
      gasLimit = new BigNumber(estimateGas).toString();
    }
    return gasLimit;
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

  private getChainIdVBN(v: number, chainId: number) {
    const vBN = new BN(v);
    const chainIdBN = new BN(chainId!);
    vBN.iadd(chainIdBN.muln(2).addn(8 + 27));
    return vBN;
  }
}

export const provider = new Provider();
