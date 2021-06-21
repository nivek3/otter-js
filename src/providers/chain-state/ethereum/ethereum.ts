import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { Transaction } from '@ethereumjs/tx';
import Common from '@ethereumjs/common';
import { BN, bufferToHex, generateAddress, toChecksumAddress } from 'ethereumjs-util';
import { trimPrefix, preparePrefix } from './../../../utils/hash';

import { TransactionReply, SendTransactionReply } from '../../../__proto__/common/types';
import {
  Network,
  DeployAccountRequest,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferTransactionRequest,
  BuildTokenTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  RebuildTransactionRequest,
} from '../../../__proto__/ethereum/types';
import { pubToBIP55Address } from './utils';
import { parseSignature } from './../../../utils/signature';

const Contract = require('web3-eth-contract');
const abi = require('./abis/multisig');
const bytecode = require('./bytecodes/multisig');
const contract = new Contract(abi);
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
    const address = toChecksumAddress(bufferToHex(generateAddress(Buffer.from(sender, 'hex'), Buffer.from(nonce!.toString(16), 'hex'))));
    return {
      serialized: tx.serialize().toString('hex'),
      signatureHash: tx.getMessageToSign(true).toString('hex'),
      address,
    };
  }

  async buildTransferTransaction(req: BuildTransferTransactionRequest): Promise<TransactionReply> {
    const { from, to, quantity, network, params } = req as Required<BuildTransferTransactionRequest>;
    const { provider, chainId } = network!;
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
    const signatureHash = tx.getMessageToSign(true).toString('hex');
    return {
      serialized: tx.serialize().toString('hex'),
      signatureHashes: [signatureHash],
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
      trimPrefix(to) + // to address
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
    const signatureHash = tx.getMessageToSign(true).toString('hex');
    return {
      serialized: tx.serialize().toString('hex'),
      signatureHashes: [signatureHash],
    };
  }

  signTransaction(req: SignTransactionRequest) {
    const { serialized, signature, network } = req as Required<SignTransactionRequest>;
    const { chainId } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const tx = Transaction.fromSerializedTx(Buffer.from(serialized, 'hex'), txOptions);
    const sign = signature[0].data;
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
    };
  }

  async rebuildTransaction(req: RebuildTransactionRequest): Promise<TransactionReply> {
    const { serialized, params = {}, network } = req as Required<RebuildTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const web3 = new Web3(provider!);
    const txOptions = { common };
    const tx = Transaction.fromSerializedTx(Buffer.from(serialized, 'hex'), txOptions);
    const { r, s, v, ...jsonTx } = tx.toJSON();

    const txData = {
      ...jsonTx,
      ...params,
    };

    if (params?.nonce !== undefined) {
      const nonce = '0x' + new BigNumber(params.nonce).toString(16);
      jsonTx.nonce = nonce;
    }

    if (!params?.gasPrice) {
      const gasPrice = await this.getReqGasPrice(web3);
      jsonTx.gasPrice = '0x' + new BigNumber(gasPrice).toString(16);
    }

    if (!params?.gasLimit) {
      delete jsonTx.gasLimit;
      const rebuildTx = {
        ...jsonTx,
      };
      const gasLimit = await this.getReqGasLimit(web3, rebuildTx);
      jsonTx.gasLimit = '0x' + new BigNumber(gasLimit).toString(16);
    }
    Object.assign(txData, jsonTx);
    const newTx = Transaction.fromTxData(txData, txOptions);
    const signatureHash = tx.getMessageToSign(true).toString('hex');
    return {
      serialized: newTx.serialize().toString('hex'),
      signatureHashes: [signatureHash],
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<SendTransactionReply> {
    const { serialized, network } = req as Required<SendTransactionRequest>;
    const { provider } = network!;
    const web3 = new Web3(provider!);
    const data = preparePrefix(serialized);
    const { transactionHash: hash } = await web3.eth.sendSignedTransaction(data);
    return {
      hash,
    };
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
      gasLimit = new BigNumber(estimateGas).multipliedBy(2).toString();
    }
    return gasLimit;
  }

  private getChainIdVBN(v: number, chainId: number) {
    const vBN = new BN(v);
    const chainIdBN = new BN(chainId!);
    vBN.iadd(chainIdBN.muln(2).addn(8));
    return vBN;
  }
}

export const provider = new Provider();
