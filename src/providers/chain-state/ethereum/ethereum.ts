import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { Transaction } from '@ethereumjs/tx';
import Common from '@ethereumjs/common';
import { BN, bufferToHex, generateAddress, toChecksumAddress } from 'ethereumjs-util';

import {
  DeployAccountRequest,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  SignTransactionRequest,
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
    const { keys, sender, network } = req as Required<BuildAccountTransactionRequest>;
    const { provider, chainId } = network!;
    let { gasLimit, gasPrice, nonce } = req;
    const common = new Common({ chain: chainId! });
    const txOptions = { common };
    const addresses = keys.map(pubToBIP55Address);
    const input = contract
      .deploy({
        data: bytecode,
        arguments: [addresses],
      })
      .encodeABI();
    const web3 = new Web3(provider!);

    if (nonce === undefined) {
      nonce = await web3.eth.getTransactionCount('0xd73d9aa55abbd6cfbed3e9ad7f8be2f6d83c70dc');
    }

    if (!gasPrice) {
      gasPrice = await web3.eth.getGasPrice();
    }

    if (!gasLimit) {
      const estimateGas = await web3.eth.estimateGas({
        from: sender,
        gasPrice,
        nonce,
        data: input,
      });
      gasLimit = '0x' + new BigNumber(estimateGas).multipliedBy(2).toString(16);
    }
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

  signTransaction(req: SignTransactionRequest) {
    const { serialized, signature, network } = req as Required<SignTransactionRequest>;
    const { chainId } = network!;
    const common = new Common({ chain: chainId! });
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

  private getChainIdVBN(v: number, chainId: number) {
    const vBN = new BN(v);
    const chainIdBN = new BN(chainId!);
    vBN.iadd(chainIdBN.muln(2).addn(8));
    return vBN;
  }
}

export const provider = new Provider();
