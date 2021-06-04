import rp from 'request-promise';
import bitGoUTXO from '@bitgo/utxo-lib';
import BigNumber from 'bignumber.js';
import coinSelect from 'coinselect';

import { TransactionReply } from '../../../__proto__/common/index';
import {
  Network,
  UTXO,
  Recipient,
  BuildTransactionRequest,
  DeployAccountRequest,
  SignTransactionRequest,
} from '../../../__proto__/bitcoin/index';

export class BitcoinStateProvider {
  deployAccount(req: DeployAccountRequest): string {
    const { keys, requiredConfirmations, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!);
    if (!network) throw new Error('Do not support such network');

    const pubKeys = keys!.map((hex) => Buffer.from(hex, 'hex'));
    const redeemScript = bitGoUTXO.script.multisig.output.encode(requiredConfirmations, pubKeys);
    const scriptPubKey = bitGoUTXO.script.scriptHash.output.encode(bitGoUTXO.crypto.hash160(redeemScript));

    return bitGoUTXO.address.fromOutputScript(scriptPubKey, network);
  }

  buildTransaction(req: BuildTransactionRequest): TransactionReply {
    const { pubKey, changer, utxos, recipients, network: reqNetWork, feeRate } = req as Required<BuildTransactionRequest>;
    const network = this.getNetWork(reqNetWork!);
    const feePerKb = new BigNumber(feeRate).toNumber();
    if (!network) throw new Error('Do not support such network');
    if (!pubKey) throw new Error('Please provider publicKey');
    if (!utxos) {
      throw new Error('Should provider the utxos');
    }

    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    utxos.forEach((utxo) => {
      utxo['txId'] = utxo.txid;
      utxo['value'] = utxo.amount;
      delete utxo.txid;
      delete utxo.amount;
    });

    const { inputs, outputs } = this.selectCoins(utxos, recipients, feePerKb);
    if (!inputs || !outputs) throw new Error(`No enough balance`);
    const hashForSignature: string[] = [];
    const txb = new bitGoUTXO.TransactionBuilder(network);
    inputs.forEach((input) => {
      txb.addInput(input.txId, input.vout);
    });
    outputs.forEach((output: { address: string; value: number }) => {
      txb.addOutput(output.address || changer, output.value);
    });

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const { redeemScript } = input;
      const publicKeyBuf = Buffer.from(pubKey, 'hex');
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      txb.prepareInput(i, publicKeyBuf, redeemScriptBuffer);
      const signingData = txb.getSigningData(i, publicKeyBuf, redeemScriptBuffer, hashType);
      hashForSignature.push(signingData.toString('hex'));
    }
    return {
      serialized: txb.buildIncomplete().toHex(),
      signatureHashes: hashForSignature,
    };
  }

  signTransaction(req: SignTransactionRequest): TransactionReply {
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    const { serialized, signature, network: reqNetwork } = req as Required<SignTransactionRequest>;
    const network = this.getNetWork(reqNetwork!);
    if (!network) throw new Error('Do not support such network');

    const tx = bitGoUTXO.Transaction.fromHex(serialized, network);
    const txb = bitGoUTXO.TransactionBuilder.fromTransaction(tx, network);

    const hashForSignature: string[] = [];

    for (let i = 0; i < txb.inputs.length; i++) {
      const { data, pubKey } = signature[i];
      if (!data || !pubKey) continue;
      const ecSignature = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.from(data, 'hex'));
      const input = txb.inputs[i];

      let m = 0;
      let sin = 0;
      let signatureHash = '';
      const { redeemScript } = input;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      if (redeemScriptBuffer) {
        const decodeScript = bitGoUTXO.script.multisig.output.decode(redeemScript);
        m = decodeScript.m;
        sin = input?.signatures?.findIndex((s: number) => !s);
      }
      const publicKeyBuf = Buffer.from(pubKey, 'hex');
      txb.prepareInput(i, publicKeyBuf, redeemScriptBuffer);
      txb.getSigningData(i, publicKeyBuf, redeemScriptBuffer, hashType);
      txb.signInput(i, sin, ecSignature, hashType);

      if (sin + 1 < m) {
        signatureHash = txb.tx.hashForSignature(i, input.signScript, hashType).toString('hex');
      }
      hashForSignature.push(signatureHash);
    }

    return {
      serialized: txb.build().toHex(),
      signatureHashes: hashForSignature,
    };
  }

  selectCoins(utxos: UTXO[], recipients: Recipient[], feeRate: number) {
    return coinSelect(utxos, recipients, feeRate);
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

  getNetWork({ scriptHash, pubKeyHash, coin }: Network) {
    return Object.values(bitGoUTXO.networks).find(
      (network: any) => network.scriptHash === Number(scriptHash) && network.pubKeyHash === Number(pubKeyHash) && network.coin === coin,
    );
  }
}

export const bitcoinStateProvider = new BitcoinStateProvider();
