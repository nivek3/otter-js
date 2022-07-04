import { pick } from 'lodash';
import Web3 from 'web3';
import { toBN, toHex } from 'web3-utils';
import type { TransactionConfig } from 'web3-core';
import { TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData, TypedTransaction } from '@ethereumjs/tx';
import Common from '@ethereumjs/common';
import { BN, bnToHex, stripHexPrefix } from 'ethereumjs-util';
import { errors, AppError } from '@src/error';

import { Network, TransactionParams } from '@src/__proto__/ethereum/common/types';
import { isBip1559Transaction } from './utils';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const Web3Method = require('web3-core-method');

export abstract class BaseProvider {
  getTxCommon(network: Network) {
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

  async getReqNonce(address: string, web3: Web3, nonce?: number) {
    if (nonce === undefined) {
      nonce = await web3.eth.getTransactionCount(address, 'pending');
    }
    return toBN(nonce).toNumber();
  }

  async getReqSequenceId(provider?: string, address?: string, sequenceId?: number) {
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

  async getReqGasPrice(web3: Web3, gasPrice?: string) {
    if (!gasPrice) {
      gasPrice = await web3.eth.getGasPrice();
    }
    return gasPrice;
  }

  async getReqGasLimit(web3: Web3, tx: TransactionConfig, gasLimit?: string) {
    if (!gasLimit) {
      const estimateGas = await web3.eth.estimateGas(tx);
      gasLimit = toHex(toBN(estimateGas));
    }
    return gasLimit;
  }

  async getReqEip155FeePerGas(web3: Web3, tx: FeeMarketEIP1559TxData): Promise<FactoryTxData> {
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

  getChainIdVBN(v: number, chainId: number, type?: number) {
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

  async getTxData(tx: FactoryTxData, _common: Common, params: TransactionParams, web3: Web3, from: string): Promise<FactoryTxData> {
    tx.data = tx.data || '0x';
    tx.value = bnToHex(toBN(tx.value?.toString() || '0x00'));
    const { to, value, data } = tx;
    const nonce = await this.getReqNonce(from, web3, params?.nonce);
    const gasPrice = await this.getReqGasPrice(web3, params?.gasPrice);
    const gasLimit = await this.getReqGasLimit(
      web3,
      {
        from,
        to,
        nonce,
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
      type: params?.type ? toHex(toBN(params.type)) : undefined,
      ...tx,
    };

    // eip1559
    if (isBip1559Transaction(txData?.type)) {
      delete txData.gasPrice;
      Object.assign(txData, pick(params, ['maxFeePerGas', 'maxPriorityFeePerGas']));
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

  getTxEstimatedFee(tx: TypedTransaction): string {
    const cost = tx.getUpfrontCost();
    return cost.sub(tx.value).toString();
  }

  getERC20TransferInput(toAddress: string, quantity: string) {
    const raw = '0000000000000000000000000000000000000000000000000000000000000000';
    const amount = stripHexPrefix(toHex(toBN(quantity)));
    return (
      '0xa9059cbb000000000000000000000000' + // token transfer method
      stripHexPrefix(toAddress) + // to address
      raw.substring(0, raw.length - amount.length) + // placeholder
      amount
    );
  }
}
