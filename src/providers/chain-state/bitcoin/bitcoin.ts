import { CSP } from '../../../types/namespaces/ChainStateProvider';
import rp from 'request-promise';
import BigNumber from 'bignumber.js';
import bitGoUTXO from 'bitgo-utxo-lib';
import coinSelect from 'coinselect';

export class BitcoinStateProvider implements CSP.IChainStateService {
  deployAccount(params: CSP.RequestParams): Promise<string> {
    const { keys, requiredConfirmations } = params.payload;
    const { pubKeyHash, scriptHash } = params.network.params;
    var pubKeys = keys.map(function (hex) {
      return Buffer.from(hex, 'hex');
    });
    var redeemScript = bitGoUTXO.script.multisig.output.encode(requiredConfirmations, pubKeys);
    var scriptPubKey = bitGoUTXO.script.scriptHash.output.encode(bitGoUTXO.crypto.hash160(redeemScript));
    return bitGoUTXO.address.fromOutputScript(scriptPubKey, {
      pubKeyHash: Number(pubKeyHash),
      scriptHash: Number(scriptHash),
    });
  }

  async buildTransaction(params: CSP.RequestParams): Promise<any> {
    const { type, data } = params.payload;
    const { bitcoreURI, coin } = params.network.params;
    const network = bitGoUTXO.networks[coin];

    if (type != 'transfer') throw new Error(`Do not support such ${type}`);
    if (!network) throw new Error(`Do not support such ${coin}`);

    const { from, to, quantity, redeem, pubKey } = data;
    const utxos = await this.getUTXOs(bitcoreURI, from);
    let redeemScript;

    const recipients = [
      {
        address: to,
        value: new BigNumber(quantity).shiftedBy(8).toNumber(),
      },
    ];

    if (redeem) {
      const { additionalKeys = [], signatures } = redeem;
      const pubKeys = [pubKey, ...additionalKeys].map((key: string) => Buffer.from(key, 'hex'));
      redeemScript = bitGoUTXO.script.multisig.output.encode(signatures, pubKeys);
    }
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    var publicKeyBuffer = Buffer.from(pubKey, 'hex');
    const feeRate = 55;
    const { inputs, outputs } = this.selectCoins(utxos, recipients, feeRate);
    if (!inputs || !outputs) {
      throw new Error(`Not enough balance`);
    }

    let hashForSignature: string[] = [];
    const txb = new bitGoUTXO.TransactionBuilder(network);
    inputs.forEach((input) => {
      txb.addInput(input.mintTxid, input.mintIndex);
    });

    outputs.forEach((output: { address: string; value: number }) => {
      const address = output.address || from;
      txb.addOutput(address, output.value);
    });

    for (let i = 0; i < txb.inputs.length; i++) {
      const signingData = txb.getSigningData(i, publicKeyBuffer, redeemScript, hashType);
      hashForSignature.push(signingData.toString('hex'));
    }
    const serialized = txb.buildIncomplete().toHex();
    return {
      serialized,
      hashForSignature,
    };
  }

  async signTransaction(params: CSP.RequestParams): Promise<any> {
    const { serialized, signature } = params.payload;
    const network = bitGoUTXO.networks.testnet;
    const tx = bitGoUTXO.Transaction.fromHex(serialized, network);
    const txb = bitGoUTXO.TransactionBuilder.fromTransaction(tx, network);
    const hashForSignature: string[] = [];
    for (let i = 0; i < txb.inputs.length; i++) {
      const input = txb.inputs[i];
      const sin = input.signatures.findIndex((s: number) => !s) + 1;
      const r = Buffer.from(signature[i].r, 'hex');
      const s = Buffer.from(signature[i].s, 'hex');
      const ecSignature = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.concat([r, s]));
      const parsed = bitGoUTXO.ECSignature.parseScriptSignature(signature);
      txb.trySign(i, sin, ecSignature, parsed.hashType);
      if (sin === 0) {
        const signatureHash = txb.tx.hashForSignature(i, input.signScript, parsed.hashType).toString('hex');
        hashForSignature.push(signatureHash);
      }
    }

    return {
      serialized: txb.build().toHex(),
      hashForSignature,
    };
  }

  selectCoins(utxos: any[], recipients: { address: string; value: number }[], feeRate: number) {
    return coinSelect(utxos, recipients, feeRate);
  }

  getUTXOs(bitcoreURI, address) {
    return this.makeRequest({
      url: `${bitcoreURI}/address/${address}?unspent=true`,
      method: 'GET',
    });
  }

  makeRequest(opts) {
    return rp({
      url: opts.url,
      method: opts.method,
      json: true,
      headers: {
        'Content-Type': 'application/json',
      },
      qs: opts.qs || {},
      body: opts.data || {},
    });
  }
}
