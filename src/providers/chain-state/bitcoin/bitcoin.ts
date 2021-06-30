import { ec as EC } from 'elliptic';
import rp from 'request-promise';
import bitGoUTXO from '@bitgo/utxo-lib';
import { payments, Network as bitcoinNetwork, address } from 'bitcoinjs-lib';
import BigNumber from 'bignumber.js';
import { finalize } from 'coinselect/utils';

import { TransactionReply, BuildTransactionReply, SendTransactionReply } from '../../../__proto__/common/types';
import {
  Network,
  TransactionOutput,
  Recipient,
  BuildTransactionRequest,
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  HashForSignatureRequest,
  HashForSignatureReply,
} from '../../../__proto__/bitcoin/types';

const DUST_AMOUNT = 546;
const ec = new EC('secp256k1');
export class BitcoinStateProvider {
  deployAccount(req: DeployAccountRequest): string {
    const { key, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as bitcoinNetwork;
    if (!network) throw new Error('Do not support such network');

    const pubkey = Buffer.from(key!, 'hex');
    const { address } = payments.p2pkh({ pubkey, network });
    return address!;
  }

  deployMultisigAccount(req: DeployMultisigAccountRequest): string {
    const { keys, threshold, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!);
    if (!network) throw new Error('Do not support such network');

    const pubKeys = keys!.map((hex) => Buffer.from(hex, 'hex'));
    const redeemScript = bitGoUTXO.script.multisig.output.encode(threshold, pubKeys);
    const scriptPubKey = bitGoUTXO.script.scriptHash.output.encode(bitGoUTXO.crypto.hash160(redeemScript));

    return bitGoUTXO.address.fromOutputScript(scriptPubKey, network);
  }

  buildTransaction(req: BuildTransactionRequest): BuildTransactionReply {
    const { changer, utxos, recipients, network: reqNetWork, params } = req as Required<BuildTransactionRequest>;
    const network = this.getNetWork(reqNetWork!);
    const dustLimit = reqNetWork?.dustLimit || DUST_AMOUNT;
    // TODO when feePerKb is null, call the node estimate fee
    const feePerKb = new BigNumber(params?.feeRate || 0).toNumber();
    if (!network) throw new Error('Do not support such network');
    if (!utxos) {
      throw new Error('Should provider the utxos');
    }

    utxos.forEach((utxo) => {
      utxo['txId'] = utxo.txid;
      utxo['value'] = utxo.amount;
      delete utxo.txid;
      delete utxo.amount;
    });

    const { inputs, outputs } = this.selectCoins(utxos, recipients, feePerKb);
    if (!inputs || !outputs) throw new Error(`No enough balance`);
    const txb = new bitGoUTXO.TransactionBuilder(network);
    inputs.forEach((input) => {
      let prevOutScript: Buffer | undefined;
      if (input.script) {
        prevOutScript = Buffer.from(input.script, 'hex');
      }
      txb.addInput(input.txId, input.vout, input.sequence, prevOutScript);
    });

    outputs.forEach((output: { address: string; value: number }) => {
      if (!address && output.value < dustLimit) return;
      txb.addOutput(output.address || changer, output.value);
    });

    return {
      serialized: txb.buildIncomplete().toHex(),
    };
  }

  hashForSignature(req: HashForSignatureRequest): HashForSignatureReply {
    const { utxos, serialized, network: reqNetWork } = req as Required<HashForSignatureRequest>;
    const network = this.getNetWork(reqNetWork!);
    if (!network) throw new Error('Do not support such network');
    if (!utxos) throw new Error('Should provider the utxos');

    const utxoMap = new Map(utxos.map((utxo: any) => [this.getUtxoKey(utxo), utxo]));
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    const tx = bitGoUTXO.Transaction.fromHex(serialized, network);
    const txb = bitGoUTXO.TransactionBuilder.fromTransaction(tx, network);

    const hashes: Record<string, string[]> = {};
    for (let i = 0; i < txb.inputs.length; i++) {
      const { hash, index } = txb.tx.ins[i];
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new Error(`Not found UTXO: ${txid}-${index}`);
      }
      const { redeemScript, signers } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      for (const pub of signers!) {
        const pubKey = Buffer.from(pub, 'hex');
        txb.prepareInput(i, pubKey, redeemScriptBuffer);
        const signingData: Buffer = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType);
        hashes[pub] = [...(hashes[pub] || []), signingData.toString('hex')];
      }
    }
    const signatureHashes = Object.keys(hashes).map((pub) => {
      return {
        pubKey: pub,
        hashes: hashes[pub],
      };
    });
    return {
      serialized: txb.buildIncomplete().toHex(),
      signatureHashes,
    };
  }

  signTransaction(req: SignTransactionRequest): TransactionReply {
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    const { serialized, utxos, signature: signatures, network: reqNetwork } = req as Required<SignTransactionRequest>;
    const network = this.getNetWork(reqNetwork!);
    if (!network) throw new Error('Do not support such network');
    const utxoMap: Map<string, TransactionOutput> = new Map(utxos.map((utxo) => [this.getUtxoKey(utxo), utxo]));
    const signatureMap = new Map(signatures!.map((signature) => [signature.pubKey, signature.data]));

    const tx = bitGoUTXO.Transaction.fromHex(serialized, network);
    const txb = bitGoUTXO.TransactionBuilder.fromTransaction(tx, network);

    for (let i = 0; i < txb.inputs.length; i++) {
      const input = txb.inputs[i];
      const ins = txb.tx.ins[i];
      const { hash, index } = ins;
      const { redeemScript, redeemScriptType } = input;
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new Error(`Not found UTXO: ${txid}-${index}`);
      }
      const { signers } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;

      for (const pub of signers!) {
        const pubKey = Buffer.from(pub, 'hex');
        const key = ec.keyFromPublic(pub, 'hex');
        txb.prepareInput(i, pubKey, redeemScriptBuffer);
        const signingData: Buffer = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType);
        const data = signatureMap.get(pub);
        if (!(Array.isArray(data) && data.length)) {
          throw new Error(`No matching signatures found`);
        }
        const sig = data.find((sig) => {
          const signature = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.from(sig, 'hex'));
          return key.verify(signingData, signature.toDER());
        });
        if (!sig) throw new Error(`No matching signature found`);
        const ecSignature = bitGoUTXO.ECSignature.fromRSBuffer(Buffer.from(sig!, 'hex'));

        let sin = 0;
        if (redeemScriptBuffer && redeemScriptType === bitGoUTXO.script.types.MULTISIG) {
          sin = input?.pubKeys?.findIndex((pub: Buffer) => pub.equals(pubKey));
          if (-1 === sin) throw new Error('PublicKey unmatched');
        }
        txb.signInput(i, sin, ecSignature, hashType);
      }
    }
    return {
      serialized: txb.build().toHex(),
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<SendTransactionReply> {
    const { network } = req as Required<SendTransactionRequest>;
    const { provider } = network!;
    const { txid } = await this.makeRequest({
      url: provider,
      method: 'POST',
      data: {
        rawTx: req.serialized,
      },
    });
    return {
      hash: txid,
    };
  }

  selectCoins(utxos: TransactionOutput[], recipients: Recipient[], feeRate: number) {
    return finalize(utxos, recipients, feeRate);
  }

  async makeRequest(opts): Promise<any> {
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

  getNetWork({ scriptHash, pubKeyHash, coin }: Network): any {
    return Object.values(bitGoUTXO.networks).find(
      (network: any) => network.scriptHash === Number(scriptHash) && network.pubKeyHash === Number(pubKeyHash) && network.coin === coin,
    );
  }

  getUtxoKey(utxo: TransactionOutput) {
    return `${utxo.txid}+${utxo.vout}`;
  }

  getTxId(hash: Buffer) {
    const txid: Buffer = Buffer.from(hash).reverse() as Buffer;
    return txid.toString('hex');
  }
}

export const bitcoinStateProvider = new BitcoinStateProvider();
