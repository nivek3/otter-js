import { omit, pick } from 'lodash';
import BigNumberJS from 'bignumber.js';
import { UnsignedTransaction, utils, ethers, BigNumber } from 'ethers';
import { calculateFees } from '@mycrypto/gas-estimation';
import { getNetwork } from '@ethersproject/networks';
import { errors, AppError } from '@src/error';
import logger from '@src/logger';

import { Network, TransactionParams } from '@src/__proto__/ethereum/common/types';
import { isEip1559 } from './utils';

export abstract class BaseProvider {
  async getReqNonce(address?: string, provider?: ethers.providers.BaseProvider, nonce?: number | string) {
    if (nonce === undefined) {
      if (!provider || !address) throw new AppError(errors.INVALID_ARGUMENT);
      nonce = await provider.getTransactionCount(address, 'pending');
    }
    return ethers.BigNumber.from(nonce).toNumber();
  }

  async getReqGasPrice(provider: ethers.providers.BaseProvider, gasPrice?: string): Promise<string> {
    if (!gasPrice) {
      const gasPrice = await provider.getGasPrice();
      return gasPrice.toHexString();
    }
    return BigNumber.from(gasPrice).toHexString();
  }

  async getReqGasLimit(
    provider: ethers.providers.BaseProvider,
    tx: ethers.providers.TransactionRequest,
    gasLimit?: string,
  ): Promise<string> {
    if (!gasLimit) {
      const request = omit(tx, ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas']);
      const estimateGas = await provider.estimateGas(request);
      gasLimit = ethers.BigNumber.from(estimateGas).toHexString();
    }
    return BigNumber.from(gasLimit).toHexString();
  }

  async getEip1559TxFeeData(
    provider: ethers.providers.BaseProvider,
    tx: ethers.providers.TransactionRequest,
    network: Network,
  ): Promise<Partial<ethers.providers.TransactionRequest>> {
    if (tx['maxFeePerGas'] && tx['maxPriorityFeePerGas']) return tx;

    const block = await provider.getBlock('latest');
    const baseFeePerGas = block['baseFeePerGas']!;
    // unsupported baseFeePerGas
    if (!baseFeePerGas) return tx;

    // use eth_feeHistory firstly
    const fee = await this.getFeeDataByHistory(provider, block.number, baseFeePerGas.toHexString());
    if (fee) return Object.assign(tx, fee);

    // baseFeeRatio * baseFee + maxPriorityFeePerGas
    const baseFeeRatio = network?.baseFeeRatio || 1;
    if (!tx.maxPriorityFeePerGas) {
      tx.maxPriorityFeePerGas = await this.maxPriorityFeePerGas(provider);
    }
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas as string;
    // https://github.com/ethers-io/ethers.js/blob/c80fcddf50a9023486e9f9acb1848aba4c19f7b6/packages/abstract-provider/src.ts/index.ts#L253
    // const maxFeePerGas = toHex(toBN(baseFeePerGas).mul(toBN(baseFeeRatio)).add(toBN(maxPriorityFeePerGas)));
    const maxFeePerGas = new BigNumberJS(baseFeePerGas.toHexString())
      .multipliedBy(new BigNumberJS(baseFeeRatio))
      .plus(maxPriorityFeePerGas)
      .toFixed(0);
    return Object.assign(tx, {
      maxFeePerGas: ethers.BigNumber.from(maxFeePerGas).toString(),
      maxPriorityFeePerGas,
    });
  }

  // gas-estimation
  async getFeeDataByHistory(
    provider: ethers.providers.BaseProvider,
    blockNumber: number,
    baseFeePerGas: string, //
  ) {
    try {
      const history = await await provider['send']('eth_feeHistory', [utils.hexValue(10), utils.hexValue(blockNumber), [5]]);
      const fee = calculateFees(ethers.BigNumber.from(baseFeePerGas).toBigInt(), history);
      if (!fee.baseFee) return; // ignore the default fee data.
      return {
        maxFeePerGas: ethers.BigNumber.from(fee.maxFeePerGas).toString(),
        maxPriorityFeePerGas: ethers.BigNumber.from(fee.maxPriorityFeePerGas).toString(),
      };
    } catch (error) {
      logger.warn('eth_feeHistory is not supported', error);
      return;
    }
  }

  getReqProvider(network: Network): ethers.providers.BaseProvider {
    const { chainId, provider } = network;
    const ethNetwork = getNetwork(chainId!);
    return new ethers.providers.StaticJsonRpcProvider(provider, ethNetwork);
  }

  async getTxData(
    provider: ethers.providers.BaseProvider,
    request: ethers.providers.TransactionRequest,
    from?: string,
    params?: TransactionParams,
    network?: Network,
  ): Promise<UnsignedTransaction> {
    const chainId = BigNumber.from(network?.chainId || provider.network.chainId).toNumber();
    request.data = request.data || '0x';
    request.value = BigNumber.from(request.value?.toString() || '0x00').toHexString();
    const type = params?.type || request.type;
    const nonce = await this.getReqNonce(from, provider, params?.nonce || request?.nonce?.toString());
    const tx: ethers.providers.TransactionRequest = {
      ...request,

      nonce,
      type: type ? ethers.BigNumber.from(type).toNumber() : undefined,
    };

    if (!tx.chainId) tx.chainId = chainId;

    if (isEip1559(type)) {
      const newData = await this.populateEip1559TxData(provider, tx, params, network);
      Object.assign(tx, newData);
    } else {
      tx.gasPrice = await this.getReqGasPrice(provider, params?.gasPrice || tx.gasPrice?.toString());
    }

    tx.gasLimit = await this.getReqGasLimit(provider, tx, params?.gasLimit || tx.gasLimit?.toString());

    if (tx.from) delete tx.from;
    return tx as UnsignedTransaction;
  }

  async populateEip1559TxData(
    provider: ethers.providers.BaseProvider,
    txData: ethers.providers.TransactionRequest,
    params?: TransactionParams,
    network?: Network,
  ): Promise<ethers.providers.TransactionRequest> {
    delete txData.gasPrice;
    Object.assign(txData, pick(params, ['maxFeePerGas', 'maxPriorityFeePerGas']));
    const newData = await this.getEip1559TxFeeData(provider, txData, network!);
    return Object.assign(txData, newData);
  }

  async maxPriorityFeePerGas(provider: ethers.providers.BaseProvider): Promise<string> {
    const maxPriorityFeePerGa = await provider['send']('eth_maxPriorityFeePerGas', []);
    return ethers.BigNumber.from(maxPriorityFeePerGa).toString();
  }

  getTxEstimatedFee(tx: UnsignedTransaction): string {
    const gasLimit = tx.gasLimit;
    const gasPrice = tx['gasPrice'] ? tx['gasPrice'] : tx['maxFeePerGas'];
    return ethers.BigNumber.from(gasLimit).mul(ethers.BigNumber.from(gasPrice)).toString();
  }

  encodeERC20Method(method: string, values: any[]) {
    const iface = new utils.Interface([
      'function name() view returns (string)',
      'function approve(address _spender, uint256 _value) returns (bool)',
      'function totalSupply() view returns (uint256)',
      'function transferFrom(address _from, address _to, uint256 _value) returns (bool)',
      'function decimals() view returns (uint8)',
      'function transferAndCall(address _to, uint256 _value, bytes _data) returns (bool success)',
      'function decreaseApproval(address _spender, uint256 _subtractedValue) returns (bool success)',
      'function balanceOf(address _owner) view returns (uint256 balance)',
      'function symbol() view returns (string)',
      'function transfer(address _to, uint256 _value) returns (bool success)',
      'function increaseApproval(address _spender, uint256 _addedValue) returns (bool success)',
      'function allowance(address _owner, address _spender) view returns (uint256 remaining)',
    ]);

    return iface.encodeFunctionData(method, values);
  }
}
