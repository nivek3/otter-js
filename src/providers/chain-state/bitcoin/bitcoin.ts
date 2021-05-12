import { CSP } from "../../../types/namespaces/ChainStateProvider";
import rp from 'request-promise';
import BigNumber from 'bignumber.js'
var bitGoUTXO = require('bitgo-utxo-lib');

export class BitcoinStateProvider implements CSP.IChainStateService {
  deployAccount(params: CSP.RequestParams): Promise<string> {
    const { keys, requiredConfirmations } = params.payload;
    const { pubKeyHash, scriptHash } = params.network.params;
    var pubKeys = keys.map(function (hex) { return Buffer.from(hex, 'hex') })
    var redeemScript = bitGoUTXO.script.multisig.output.encode(requiredConfirmations, pubKeys);
    var scriptPubKey = bitGoUTXO.script.scriptHash.output.encode(bitGoUTXO.crypto.hash160(redeemScript));
    return bitGoUTXO.address.fromOutputScript(scriptPubKey, {
      pubKeyHash: Number(pubKeyHash),
      scriptHash: Number(scriptHash),
    });
  }

  async buildTransaction(params: CSP.RequestParams): Promise<any> {
    const { type, data } = params.payload;
    const { bitcoreURI } = params.network.params;
    if (type != 'transfer') throw 'un sup';
    const { from, to, quantity } = data;
    const utxos = await this.getUTXOs(bitcoreURI, from);
    const recipients = [
      {
        address: to,
        amount: new BigNumber(quantity).shiftedBy(8).toNumber()
      }
    ]
    var hashType = bitGoUTXO.Transaction.SIGHASH_ALL
    var redeemScript = Buffer.from('522102f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5210377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd2102f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b26653ae', 'hex');
    var publicKeyBuffer = Buffer.from('02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', 'hex');
    const feeValue = 20000;
    const filteredUtxos = this.selectCoins(recipients, utxos, feeValue);
    let hashForSignature: string[] = []
    var txb = new bitGoUTXO.TransactionBuilder(bitGoUTXO.networks.testnet);
    var inputValue = new BigNumber(0);
    filteredUtxos.forEach(utxo => {
      txb.addInput(utxo.mintTxid, utxo.mintIndex);
      inputValue = inputValue.plus(utxo.value);
    });
    var outputValue = new BigNumber(quantity).shiftedBy(8);
    txb.addOutput(to, outputValue.toNumber())
    var change = inputValue.minus(outputValue).minus(feeValue)
    txb.addOutput(from, change.toNumber())
    
    var input = txb.inputs[0]
    txb.prepareInput(input, publicKeyBuffer, redeemScript)
    var signatureHash: string = txb.tx.hashForSignature(0, input.signScript, hashType).toString('hex')
    txb.inputs.forEach(() => {
      hashForSignature.push(signatureHash)
    });
    const serialized = txb.buildIncomplete().toHex();
    return {
      serialized,
      hashForSignature
    };
  }

  async signTransaction(params: CSP.RequestParams): Promise<any> {
    const { serialized, signature } = params.payload;
    const network = bitGoUTXO.networks.testnet;
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL
    const tx = bitGoUTXO.Transaction.fromHex(serialized, network);
    const txb = bitGoUTXO.TransactionBuilder.fromTransaction(tx, network);
    let hashForSignature: string[] = []
    for (var i = 0; i < txb.inputs.length; i++) {
      var input = txb.inputs[i];
      const r = Buffer.from(signature[i].r, 'hex');
      const s = Buffer.from(signature[i].s, 'hex');
      if (input.signatures[0] === 0) {  // 一签
        input.signatures[0] = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.concat([r, s])).toScriptSignature(hashType);
        // 准备二签
        var signatureHash: string = txb.tx.hashForSignature(i, input.signScript, hashType).toString('hex')
        hashForSignature.push(signatureHash);
      } else { // 二签
        input.signatures[1] = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.concat([r, s])).toScriptSignature(hashType);
      }
    }
    return {
      serialized: txb.build().toHex(),
      hashForSignature,
    }
  }

  selectCoins(recipients, utxos, fee) {
    utxos = utxos.sort(function(a, b) {
      return a.utxo.mintHeight - b.utxo.mintHeight;
    });
  
    let index = 0;
    let utxoSum = 0;
    let recepientSum = recipients.reduce(
      (sum, cur) => sum + Number(cur.amount),
      fee
    );
    while (utxoSum < recepientSum) {
      const utxo = utxos[index];
      utxoSum += Number(utxo.value);
      index += 1;
    }
    const filteredUtxos = utxos.slice(0, index);
    return filteredUtxos;
  }

  getUTXOs(bitcoreURI, address) {
    return this.makeRequest({
      url: `${bitcoreURI}/address/${address}?unspent=true`,
      method: 'GET'
    });
  };

  makeRequest(opts) {
    return rp({
      url: opts.url,
      method: opts.method,
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      qs: opts.qs || {},
      body: opts.data || {},
    });
  }
}