import { ec as EC } from 'elliptic';
import rp from 'request-promise';
import bitGoUTXO from '@bitgo/utxo-lib';
import { payments, Network as bitcoinNetwork, address, networks } from 'bitcoinjs-lib';
import BigNumber from 'bignumber.js';
import { finalize } from 'coinselect/utils';
import { parseSignature } from './../../../utils/signature';

import { TransactionReply, BuildTransactionReply, SendTransactionReply } from '../../../__proto__/common/types';
import {
  Network,
  UnspentTransactionOutput,
  Recipient,
  BuildTransactionRequest,
  DeployAccountRequest,
  DeployMultisigAccountRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  HashForSignatureRequest,
  HashForSignatureReply,
  Signature,
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

  async buildTransaction(req: BuildTransactionRequest): Promise<BuildTransactionReply> {
    const { changer, utxos, recipients, network: reqNetWork, params } = req as Required<BuildTransactionRequest>;
    const network = this.getNetWork(reqNetWork!);
    if (!network) throw new Error('Do not support such network');

    const dustLimit = reqNetWork?.dustLimit || DUST_AMOUNT;
    const feePerKb = await this.getReqFeePerKb(reqNetWork!.provider!, params?.feeRate, 1);

    if (!utxos) {
      throw new Error('Should provider the utxos');
    }

    this.calcInputBytes(utxos);

    const { inputs, outputs } = this.selectCoins(utxos, recipients, feePerKb);

    if (!inputs || !outputs) throw new Error(`No enough balance`);
    const txb = new bitGoUTXO.TransactionBuilder(network);
    inputs.forEach((input) => {
      let prevOutScript: Buffer | undefined;
      if (input.scriptPubKey) {
        prevOutScript = Buffer.from(input.scriptPubKey, 'hex');
      }
      txb.addInput(input.txid, input.vout, input.sequence, prevOutScript);
    });

    outputs.forEach((output: { address: string; value: number }) => {
      if (!address && output.value < dustLimit) return;
      txb.addOutput(output.address || changer, output.value);
    });

    return {
      hash: txb.tx.getHash().toString('hex'),
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

    const signatures: Signature[] = [];
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
        const hash: Buffer = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType);
        signatures.push({
          pubKey: pub,
          hash: hash.toString('hex'),
        });
      }
    }
    return {
      serialized: txb.buildIncomplete().toHex(),
      signatures,
    };
  }

  signTransaction(req: SignTransactionRequest): TransactionReply {
    const hashType = bitGoUTXO.Transaction.SIGHASH_ALL;
    const { serialized, utxos, signatures, network: reqNetwork } = req as Required<SignTransactionRequest>;
    const network = this.getNetWork(reqNetwork!);
    if (!network) throw new Error('Do not support such network');
    const utxoMap: Map<string, UnspentTransactionOutput> = new Map(utxos.map((utxo) => [this.getUtxoKey(utxo), utxo]));
    const signatureMap = signatures.reduce((acc, cur) => {
      const { signature, pubKey } = cur;
      const { r, s } = parseSignature(signature!);
      acc[pubKey!] = [...new Set(acc[pubKey!]).add(r + s)];
      return acc;
    }, {});

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
        const data = signatureMap[pub];
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
    const { result, error } = await this.makeRequest({
      url: provider,
      method: 'sendrawtransaction',
      params: [req.serialized],
    });
    if (error) {
      throw new Error(error);
    }
    return {
      hash: result,
    };
  }

  selectCoins(utxos: UnspentTransactionOutput[], recipients: Recipient[], feeRate: number) {
    return finalize(utxos, recipients, feeRate);
  }

  async makeRequest({ url, method, params }): Promise<any> {
    const { body } = await rp({
      url: url,
      method: 'POST',
      json: true,
      body: {
        jsonrpc: '1.0',
        id: Date.now(),
        method,
        params,
      },
    });
    return body;
  }

  getNetWork({ scriptHash, pubKeyHash, coin }: Network): any {
    return Object.values(bitGoUTXO.networks).find(
      (network: any) => network.scriptHash === Number(scriptHash) && network.pubKeyHash === Number(pubKeyHash) && network.coin === coin,
    );
  }

  getUtxoKey(utxo: UnspentTransactionOutput) {
    return `${utxo.txid}+${utxo.vout}`;
  }

  getTxId(hash: Buffer) {
    const txid: Buffer = Buffer.from(hash).reverse() as Buffer;
    return txid.toString('hex');
  }

  // https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c
  calcInputBytes(utxos: UnspentTransactionOutput[]) {
    const types = bitGoUTXO.script.types;
    const classifyOutput = bitGoUTXO.script.classifyOutput;
    const inputs: Record<string, number> = {
      'MULTISIG-P2SH': 49 * 4,
      'MULTISIG-P2WSH': 6 + 41 * 4,
      'MULTISIG-P2SH-P2WSH': 6 + 76 * 4,
      [types.P2PKH]: 148 * 4,
      [types.P2SH]: 108 * 4,
      [types.P2WPKH]: 108 + 41 * 4,
      'P2SH-P2WPKH': 108 + 64 * 4,
    };

    utxos.forEach((utxo) => {
      utxo['value'] = utxo.amount;
      utxo['txId'] = utxo.txid;

      const { scriptPubKey, redeemScript } = utxo;
      if (!scriptPubKey) return;
      const type: string = classifyOutput(Buffer.from(scriptPubKey, 'hex'));
      if (!inputs[type]) return;

      let length: number = 0;
      if (redeemScript) {
        const redeemScriptBuffer = Buffer.from(redeemScript, 'hex');
        const redeemScriptType = classifyOutput(redeemScriptBuffer);
        if (redeemScriptType == types.MULTISIG) {
          const typeKey = Object.keys(types).find((key) => types[key] === type);
          const newKey = `MULTISIG-${typeKey}`;
          const { m, pubKeys } = bitGoUTXO.script.multisig.output.decode(redeemScriptBuffer);
          const n = pubKeys.length;
          const multiplier = newKey === 'MULTISIG-P2SH' ? 4 : 1;
          const weight = inputs[newKey] + (73 * m + 34 * n) * multiplier;
          length = Math.ceil(weight / 4);
        }
      }
      if (!length) {
        const weight = inputs[type];
        length = Math.ceil(weight / 4);
      }

      utxo['script'] = { length };
    });
  }

  // https://chainquery.com/bitcoin-cli/estimatesmartfee
  private async getReqFeePerKb(url: string, feeRate = 0, blocks = 1) {
    if (!feeRate) {
      const { result, error } = await this.makeRequest({
        url,
        method: 'estimatesmartfee',
        params: [blocks],
      });
      if (error) throw new Error('Could not fetch the fee rate');
      const feePreKb = new BigNumber(result.feerate).multipliedBy(8).div(1024).toFixed(0);
      feeRate = new BigNumber(feePreKb).toNumber();
    }
    return feeRate;
  }
}

export const bitcoinStateProvider = new BitcoinStateProvider();
