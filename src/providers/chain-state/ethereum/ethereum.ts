import { CSP } from "../../../types/namespaces/ChainStateProvider";
import rp from 'request-promise';
import { Transaction } from '@ethereumjs/tx'
import { keccak256 as k256 } from 'ethereum-cryptography/keccak'
import BigNumber from 'bignumber.js'

var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
var Accounts = require('web3-eth-accounts');
const Contract = require('web3-eth-contract');
const ethJsUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const abiDecoder = require('abi-decoder');
const rlp = require('rlp')
const BN = require('bn.js');
const EMPTY_SIGNATURE = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export class EthereumStateProvider implements CSP.IChainStateService {
  async deployAccount(params: CSP.RequestParams): Promise<string> {
    const { keys } = params.payload;
    const { rpcURI } = params.network.params;
    const abi = require('./abis/multisig');
    const bytecode = require('./bytecodes/multisig');
    const contract = new Contract(abi);
    const addresses = keys.map(key => ethJsUtil.bufferToHex(ethJsUtil.pubToAddress(Buffer.from(ec.keyFromPublic(key, 'hex').getPublic(false, 'hex'), 'hex').slice(1))));
    const input = contract.deploy({
      data: bytecode,
      arguments: [addresses]
    }).encodeABI()

    const rawTx = {
      data: input
    }

    const nonce = await this.getTransactionCount(rpcURI, '0xd73d9aa55abbd6cfbed3e9ad7f8be2f6d83c70dc');
    const gasPrice = await this.getGasPrice(rpcURI);
    const gas = await this.estimateGas(rpcURI, rawTx);

    const { rawTransaction } = await new Accounts(rpcURI).signTransaction({
      ...rawTx,
      ...{ nonce, gas, gasPrice }
    }, '0x2ef4813a7b4181f6b0eb57fa4b980740cbd4d827da81c39324870ee3368da087');
    
    await this.makeRequest({
      rpcURI,
      method: 'eth_sendRawTransaction',
      params: [ rawTransaction ],
    });
    const futureAddress = ethJsUtil.bufferToHex(ethJsUtil.generateAddress('0xd73d9aa55abbd6cfbed3e9ad7f8be2f6d83c70dc', parseInt(nonce, 16)));
    return futureAddress;
  }
  
  async buildTransaction(params: CSP.RequestParams): Promise<any> {
    const { type, data } = params.payload;
    const { rpcURI } = params.network.params;

    let txParams, hashForSignature;
    if (type === 'transfer') {
      const { from, to, quantity } = data;
      const sequenceId = await this.getNextSequenceId(rpcURI, from);
      const expireTime = Math.floor((new Date().getTime()) / 1000) + 600; // 600 seconds
      hashForSignature = this.getSha3ForConfirmationTx('ETHER', to, quantity, '', expireTime, parseInt(sequenceId, 16)).toString('hex');
      const abi = require('./abis/multisig');
      const contract = new Contract(abi);
      const input = contract.methods.sendMultiSig(to, new BigNumber(quantity).shiftedBy(18).toFixed(), '0x', expireTime, sequenceId, EMPTY_SIGNATURE).encodeABI();
      txParams = {
        to: from,
        value: `0x`,
        data: input,
      }
    } else if (type === 'token-transfer') {
      const { from, to, quantity } = data;
      const value = quantity.toString(16);
      const raw = '0000000000000000000000000000000000000000000000000000000000000000';
      const input = '0xa9059cbb000000000000000000000000' + to[0].address.substring(2, to[0].address.length) + raw.substring(0, raw.length - value.length) + value;
      txParams = {
        from,
        to,
        data: input,
      }
    } else {
      throw 'Unsupported transaction types';
    }
    const nonce = '0x' // 占位无用 //await this.getTransactionCount(rpcURI, txParams.from);
    const gasPrice = await this.getGasPrice(rpcURI);
    const gasLimit = '0x30D40'; // 200,000 //await this.estimateGas(rpcURI, txParams);
    txParams = {
      ...{ nonce, gasPrice, gasLimit },
      ...txParams
    };
    const tx = Transaction.fromTxData(txParams);
    return {
      serialized: tx.serialize().toString('hex'),
      hashForSignature: [ hashForSignature ],
    }
  }

  async signTransaction(params: CSP.RequestParams): Promise<any> {
    const { serialized, signature } = params.payload;
    const { rpcURI, chainId } = params.network.params;
    const tx = Transaction.fromSerializedTx(Buffer.from(serialized, 'hex'));
    if (tx.isSigned()) { throw 'Already signed' }
    const abi = require('./abis/multisig');
    abiDecoder.addABI(abi);
    let txDataHex = tx.data.toString('hex')
    const decodedData = abiDecoder.decodeMethod(`0x${txDataHex}`);
    const txParams = tx.toJSON()
    let hashForSignature;
    // 添加第一次签名
    if (decodedData.params[5].value === EMPTY_SIGNATURE) {
      const serializeSignature = Buffer.concat([Buffer.from(signature[0].r, 'hex'), Buffer.from(signature[0].s, 'hex'), Buffer.from([signature[0].recoveryParam + 27])]).toString('hex');
      txDataHex = txDataHex.replace(EMPTY_SIGNATURE.slice(2), serializeSignature);
      txParams.data = `0x${txDataHex}`;

      const nonce = await this.getTransactionCount(rpcURI, '0x8b67944F06DA3f68e0C97ff54d3b27D960134C63');
      txParams.nonce = `0x${new BN(nonce.slice(2), 16).toBuffer().toString('hex')}`
    }
    // 已经完成第一次签名，准备添加确认签名
    else {
      // TODO
      const recoveryParam = signature[0].recoveryParam;
      const v = recoveryParam + (parseInt(chainId, 16) * 2 + 35); //27;
      txParams.r = `0x${signature[0].r}`;
      txParams.s = `0x${signature[0].s}`;
      txParams.v = `0x${v.toString(16)}`;
    }
    if (!this.isSigned(txParams)) { hashForSignature = [ this.hashForSignature(txParams, chainId).toString('hex') ] }
    return {
      serialized: this.serializeTransaction(txParams),
      hashForSignature,
    }
  }

  isSigned(txParams) {
    return !!txParams.r && !!txParams.s
  }

  hashForSignature(txParams, chainId) {
    let items = [
      new BN(txParams.nonce.slice(2), 16).toBuffer(),
      new BN(txParams.gasPrice.slice(2), 16).toBuffer(),
      new BN(txParams.gasLimit.slice(2), 16).toBuffer(),
      new BN(txParams.to.slice(2), 16).toBuffer(),
      Buffer.allocUnsafe(0),
      // new BN(txParams.value.slice(2), 16).toBuffer(),
      new BN(txParams.data.slice(2), 16).toBuffer(),
      Buffer.from(chainId.slice(2), 'hex'), 
      Buffer.allocUnsafe(0), 
      Buffer.allocUnsafe(0),
    ]
    let encoded = rlp.encode(items)
    return k256(encoded);
  }
  serializeTransaction(txParams) {
    return rlp.encode([
      new BN(txParams.nonce.slice(2), 16).toBuffer(),
      new BN(txParams.gasPrice.slice(2), 16).toBuffer(),
      new BN(txParams.gasLimit.slice(2), 16).toBuffer(),
      new BN(txParams.to.slice(2), 16).toBuffer(),
      Buffer.allocUnsafe(0),
      // new BN(txParams.value.slice(2), 16).toBuffer(),
      new BN(txParams.data.slice(2), 16).toBuffer(),
      Buffer.from((txParams.v || '0x').slice(2), 'hex'),
      Buffer.from((txParams.r || '0x').slice(2), 'hex'),
      Buffer.from((txParams.s || '0x').slice(2), 'hex'),
    ]).toString('hex')
  }

  getSha3ForConfirmationTx(prefix, toAddress, amount, data, expireTime, sequenceId) {
    const value = new BigNumber(amount).shiftedBy(18).toFixed();
    return abi.soliditySHA3(
      [ 'string', 'address', 'uint', 'string', 'uint', 'uint' ],
      [ prefix, new BN(toAddress.replace('0x', ''), 16), value, data, expireTime, sequenceId ]
    );
  };

  async getNextSequenceId(rpcURI, address) {
    return await this.makeRequest({
      rpcURI,
      method: 'eth_call',
      params: [ 
        {
          'to': address,
          'data': '0xa0b7967b'
        }, 
        'latest' 
      ],
    })
  }

  async getTransactionCount(rpcURI, address) {
    return await this.makeRequest({
      rpcURI,
      method: 'eth_getTransactionCount',
      params: [ address, 'latest' ],
    })
  }

  async getGasPrice(rpcURI) {
    return await this.makeRequest({
      rpcURI,
      method: 'eth_gasPrice',
      params: [],
    })
  }

  async estimateGas(rpcURI, rawTx) {
    return await this.makeRequest({
      rpcURI,
      method: 'eth_estimateGas',
      params: [ rawTx ],
    })
  }

  makeRequest(opts) {
    let rpcURI = opts.rpcURI
    let options = {
      uri: rpcURI,
      method: 'POST',
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        jsonrpc: '2.0',
        method: opts.method,
        params: opts.params,
        id: 1
      }
    };
    return rp(options).then(res => {
      if (res.error) {
        throw res.error.message;
      }
      if (res.result == null) {
        throw 'Not Found';
      }
      return res.result;
    });
  }
}