import { toNumber } from 'lodash';
import { ec as EC } from 'elliptic';
import ECSignature from 'elliptic/lib/elliptic/ec/signature';
import rp from 'request-promise';
import { payments, bitgo, networks, Network as BitgoNetwork, classify, BitcoinJSNetwork, Transaction } from '@cryptoless/utxo-lib';
import BigNumber from 'bignumber.js';
import { finalize } from 'coinselect/utils';
import { canonicalSignature } from '@src/utils/signature';
import { Validator } from '@src/utils/ajv';
import { AppError, errors } from '@src/error';
import { TransactionReply, Signature } from '@src/__proto__/common/types';
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
} from '@src/__proto__/bitcoin/types';

import {
  BitCoinRefSchema,
  DeployAccountRequestSchema,
  DeployMultisigAccountRequestSchema,
  BuildTransactionRequestSchema,
  HashForSignatureRequestSchema,
  SignTransactionRequestSchema,
  SendTransactionRequestSchema,
} from './bitcoin.schema';

const DUST_AMOUNT = 546;
const ec = new EC('secp256k1');

const validator = new Validator({ schemas: [BitCoinRefSchema] });
export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as BitcoinJSNetwork;
    if (!network) throw new AppError(errors.INVALID_NETWORK);
    const pubkey = Buffer.from(key!, 'hex');

    const { address } = payments.p2pkh({ pubkey, network });
    return address!;
  }

  deploySegwitAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as BitcoinJSNetwork;
    if (!network) throw new AppError(errors.INVALID_NETWORK);
    const pubkey = Buffer.from(key!, 'hex');
    const { address } = payments.p2wpkh({ pubkey, network });
    return address!;
  }

  deployMultisigLegacyAccount(req: DeployMultisigAccountRequest): string {
    validator.assert(DeployMultisigAccountRequestSchema, req);

    const { keys, threshold, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as BitcoinJSNetwork;
    if (!network) throw new AppError(errors.INVALID_NETWORK);

    const pubkeys = keys!.map((hex) => Buffer.from(hex, 'hex'));

    const { address } = payments.p2sh({
      redeem: payments.p2ms({ m: threshold, pubkeys, network }),
      network,
    });

    return address!;
  }

  deployMultisigSegwitAccount(req: DeployMultisigAccountRequest): string {
    validator.assert(DeployMultisigAccountRequestSchema, req);

    const { keys, threshold, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as BitcoinJSNetwork;
    if (!network) throw new AppError(errors.INVALID_NETWORK);

    const pubkeys = keys!.map((hex) => Buffer.from(hex, 'hex'));
    const p2ms = payments.p2ms({ m: threshold, pubkeys, network });
    const p2wsh = payments.p2wsh({ redeem: p2ms, network });
    return p2wsh.address!;
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { changer, utxos, recipients, network: reqNetWork, params } = req as Required<BuildTransactionRequest>;
    const network = this.getNetWork(reqNetWork!);
    const hashType = bitgo.getDefaultSigHash(network);

    if (!network) throw new AppError(errors.INVALID_NETWORK);
    if (!(Array.isArray(utxos) && utxos.length)) throw new AppError(errors.INVALID_UTXOS);
    const utxoMap = new Map(utxos.map((utxo: any) => [this.getUtxoKey(utxo), utxo]));

    const dustLimit = reqNetWork?.dustLimit || DUST_AMOUNT;
    const feePerKb = await this.getReqFeePerKb(reqNetWork!.provider!, params?.feeRate, 1);

    this.calcInputBytes(utxos, network as BitcoinJSNetwork);

    const { inputs, outputs, fee } = this.selectCoins(utxos, recipients, feePerKb);

    if (!inputs || !outputs) throw new AppError(errors.NOT_ENOUGH_BALANCE);

    const txb = bitgo.createTransactionBuilderForNetwork(network);

    inputs.forEach((input) => {
      let prevOutScript: Buffer | undefined;
      if (input.prevOutScript) {
        prevOutScript = Buffer.from(input.prevOutScript, 'hex');
      }
      txb.addInput(input.txid, input.vout || 0, input.sequence, prevOutScript);
    });

    outputs.forEach((output: { address: string; value: number }) => {
      if (!output.address && output.value < dustLimit) return;
      txb.addOutput(output.address || changer, output.value);
    });

    const serialized = txb.buildIncomplete().toHex();
    const signatures = this.getTxbSignatures(txb, hashType, utxoMap);

    return {
      serialized,
      signatures,
      estimatedFee: fee,
    };
  }

  hashForSignature(req: HashForSignatureRequest): TransactionReply {
    validator.assert(HashForSignatureRequestSchema, req);

    const { utxos, serialized, network: reqNetWork } = req as Required<HashForSignatureRequest>;
    const network = this.getNetWork(reqNetWork!);
    const hashType = bitgo.getDefaultSigHash(network);

    if (!network) throw new AppError(errors.INVALID_NETWORK);
    if (!(Array.isArray(utxos) && utxos.length)) throw new AppError(errors.INVALID_UTXOS);

    const utxoMap = new Map(utxos.map((utxo: any) => [this.getUtxoKey(utxo), utxo]));
    const tx = bitgo.createTransactionFromHex(serialized, network);
    const txb = bitgo.createTransactionBuilderForNetwork(network);
    this.cloneTx(txb, tx, utxoMap);

    const signatures = this.getTxbSignatures(txb, hashType, utxoMap);

    const estimatedFee = this.getTxEstimatedFee(txb.tx, utxos);
    return {
      serialized,
      signatures,
      estimatedFee,
    };
  }

  signTransaction(req: SignTransactionRequest): TransactionReply {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized, utxos, signatures, network: reqNetwork } = req as Required<SignTransactionRequest>;
    const network = this.getNetWork(reqNetwork!);
    const hashType = bitgo.getDefaultSigHash(network);

    if (!network) throw new AppError(errors.INVALID_NETWORK);
    if (!(Array.isArray(utxos) && utxos.length)) throw new AppError(errors.INVALID_UTXOS);

    const utxoMap: Map<string, UnspentTransactionOutput> = new Map(utxos.map((utxo) => [this.getUtxoKey(utxo), utxo]));

    const tx = bitgo.createTransactionFromHex(serialized, network);
    const txb = bitgo.createTransactionBuilderForNetwork(network);

    this.cloneTx(txb, tx, utxoMap);

    for (let i = 0; i < tx.ins.length; i++) {
      const ins = tx.ins[i];
      const { hash, index } = ins;
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new AppError(errors.NO_MATCHING_UTXO_FOUND, {
          details: `${errors.NO_MATCHING_UTXO_FOUND.details}: ${txid}-${index}`,
        });
      }
      const { signers = [], redeemScript, amount, witnessScript } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      const witnessScriptBuffer = witnessScript ? Buffer.from(witnessScript, 'hex') : undefined;
      const prepare = signers[0];
      const pubKey = Buffer.from(prepare, 'hex');
      const { signatureHash } = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType, toNumber(amount), witnessScriptBuffer);

      const related = signatures.filter((sig) => sig.hash === signatureHash.toString('hex'));
      if (!related.length) throw new AppError(errors.INVALID_SIGNATURES);

      for (const { signature, pubKey } of related!) {
        const pubKeyBuf = Buffer.from(pubKey!, 'hex');
        const key = ec.keyFromPublic(pubKeyBuf, 'hex');
        if (!signature) {
          throw new AppError(errors.VERIFY_SIGNATURE_FAILED);
        }
        const { r, s } = canonicalSignature(signature!);
        const ecSignature = new ECSignature({ r, s });

        if (!key.verify(signatureHash, ecSignature)) throw new AppError(errors.VERIFY_SIGNATURE_FAILED);
        txb.signInput(i, pubKeyBuf, Buffer.from(r + s, 'hex'), hashType);
      }
    }
    const utxoTx = txb.build();
    const estimatedFee = this.getTxEstimatedFee(txb.tx, utxos);

    return {
      hash: utxoTx.getId(),
      serialized: utxoTx.toHex(),
      estimatedFee,
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { network } = req as Required<SendTransactionRequest>;
    const { provider } = network!;
    const { result, error } = await this.makeRequest({
      url: provider,
      method: 'sendrawtransaction',
      params: [req.serialized],
    });
    if (error) {
      throw new AppError(errors.MAKE_REQUEST_FAILED, { details: error.message });
    }
    return {
      hash: result,
    };
  }

  cloneTx(txb: bitgo.UtxoTransactionBuilder<bitgo.UtxoTransaction>, tx: bitgo.UtxoTransaction, utxoMap: Map<string, any>) {
    for (let i = 0; i < tx.ins.length; i++) {
      const { hash, index, sequence } = tx.ins[i];
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new AppError(errors.NO_MATCHING_UTXO_FOUND, {
          details: `${errors.NO_MATCHING_UTXO_FOUND.details}: ${txid}-${index}`,
        });
      }
      txb.addInput(txid, index, sequence, utxo.prevOutScript ? Buffer.from(utxo.prevOutScript, 'hex') : undefined);
    }

    for (let i = 0; i < tx.outs.length; i++) {
      const { script, value } = tx.outs[i];
      txb.addOutput(script, value);
    }
  }

  getTxbSignatures(txb: bitgo.UtxoTransactionBuilder<bitgo.UtxoTransaction>, hashType: number, utxoMap: Map<string, any>) {
    const signatures: Signature[] = [];

    for (let i = 0; i < txb.tx.ins.length; i++) {
      const { hash, index } = txb.tx.ins[i];
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new AppError(errors.NO_MATCHING_UTXO_FOUND, {
          details: `${errors.NO_MATCHING_UTXO_FOUND.details}: ${txid}-${index}`,
        });
      }

      const { redeemScript, witnessScript, signers, amount } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      const witnessScriptBuffer = witnessScript ? Buffer.from(witnessScript, 'hex') : undefined;
      for (const pub of signers!) {
        const pubKey = Buffer.from(pub, 'hex');
        const { signatureHash } = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType, toNumber(amount), witnessScriptBuffer);
        signatures.push({
          pubKey: pub,
          hash: signatureHash.toString('hex'),
        });
      }
    }
    return signatures;
  }

  selectCoins(utxos: UnspentTransactionOutput[], recipients: Recipient[], feeRate: number) {
    const output = recipients.map((output: any) => {
      output['value'] = +output.value!;
      return output;
    });
    return finalize(utxos, output, feeRate);
  }

  async makeRequest({ url, method, params }): Promise<any> {
    return await rp({
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
  }

  getNetWork({ scriptHash, pubKeyHash, coin, forkChain, bech32 }: Network): BitgoNetwork {
    const bitgoNetwork: any = Object.values(networks).find(
      (network: any) =>
        network.scriptHash === Number(scriptHash) &&
        network.pubKeyHash === Number(pubKeyHash) &&
        network.coin === coin &&
        (!bech32 || network.bech32 === bech32),
    );
    let forkNetwork = bitgoNetwork || (forkChain && networks[forkChain]) || networks.bitcoin;

    const network = {
      ...forkNetwork,
      scriptHash: Number(scriptHash),
      pubKeyHash: Number(pubKeyHash),
      coin,
      forkChain: forkNetwork,
    };

    if (bech32) network['bech32'] = bech32;

    return network as BitgoNetwork;
  }

  getUtxoKey(utxo: UnspentTransactionOutput) {
    return `${utxo.txid}+${utxo.vout || 0}`;
  }

  getTxId(hash: Buffer) {
    const txid: Buffer = Buffer.from(hash).reverse() as Buffer;
    return txid.toString('hex');
  }

  // https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c
  calcInputBytes(utxos: UnspentTransactionOutput[], network: BitcoinJSNetwork) {
    const types = classify.types;
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
      utxo['value'] = +(utxo.amount || 0);
      utxo['txId'] = utxo.txid;

      const { prevOutScript, redeemScript } = utxo;
      if (!prevOutScript) return;

      const type: string = classify.output(Buffer.from(prevOutScript, 'hex'));
      if (!inputs[type]) return;

      let length: number = 0;
      if (redeemScript) {
        const redeemScriptBuffer = Buffer.from(redeemScript, 'hex');
        const redeemScriptType = classify.output(redeemScriptBuffer);
        if (redeemScriptType === types.P2MS) {
          const typeKey = Object.keys(types).find((key) => types[key] === type);
          const newKey = `MULTISIG-${typeKey}`;
          const { m = 0, pubkeys = [] } = payments.p2ms({ output: redeemScriptBuffer, network });
          const n = pubkeys.length;
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
  private async getReqFeePerKb(url: string, feeRate = '', blocks = 1) {
    if (!feeRate) {
      const { result, error } = await this.makeRequest({
        url,
        method: 'estimatesmartfee',
        params: [blocks],
      });
      if (error) throw new AppError(errors.MAKE_REQUEST_FAILED, { details: 'Could not fetch the fee rate' });
      feeRate = new BigNumber(result.feerate).shiftedBy(8).div(1024).toFixed(0);
    }
    return new BigNumber(feeRate).toNumber();
  }

  getTxEstimatedFee(tx: Transaction, utxos: UnspentTransactionOutput[]): string {
    const inputs = BigNumber.sum.apply(
      null,
      utxos.map((utxo) => utxo.amount!),
    );
    const outputs = BigNumber.sum.apply(
      null,
      tx.outs.map((out) => out.value),
    );
    return new BigNumber(inputs).minus(outputs).toString();
  }
}

export const provider = new Provider();
