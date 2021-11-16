import { ec as EC } from 'elliptic';
import ECSignature from 'elliptic/lib/elliptic/ec/signature';
import rp from 'request-promise';
import { payments, bitgo, networks, Network as BitgoNetwork, classify, BitcoinJSNetwork, Transaction } from '@cryptoless/utxo-lib';
import BigNumber from 'bignumber.js';
import { finalize } from 'coinselect/utils';
import { parseSignature } from '../../../utils/signature';
import { Validator } from '../../../utils/ajv';
import { AppError, errors } from '../../../error';
import { TransactionReply, Signature } from '../../../__proto__/common/types';
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
} from '../../../__proto__/bitcoin/types';

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

  deployMultisigAccount(req: DeployMultisigAccountRequest): string {
    validator.assert(DeployMultisigAccountRequestSchema, req);

    const { keys, threshold, network: reqNetWork } = req;
    const network = this.getNetWork(reqNetWork!) as BitcoinJSNetwork;
    if (!network) throw new AppError(errors.INVALID_NETWORK);

    const pubKeys = keys!.map((hex) => Buffer.from(hex, 'hex'));

    const { address } = payments.p2sh({
      redeem: payments.p2ms({ m: threshold, pubkeys: pubKeys, network }),
      network,
    });

    return address!;
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { changer, utxos, recipients, network: reqNetWork, params } = req as Required<BuildTransactionRequest>;
    const network = this.getNetWork(reqNetWork!);

    if (!network) throw new AppError(errors.INVALID_NETWORK);
    if (!(Array.isArray(utxos) && utxos.length)) throw new AppError(errors.INVALID_UTXOS);

    const dustLimit = reqNetWork?.dustLimit || DUST_AMOUNT;
    const feePerKb = await this.getReqFeePerKb(reqNetWork!.provider!, params?.feeRate, 1);

    this.calcInputBytes(utxos, network as BitcoinJSNetwork);

    const { inputs, outputs } = this.selectCoins(utxos, recipients, feePerKb);

    if (!inputs || !outputs) throw new AppError(errors.NOT_ENOUGH_BALANCE);

    const txb = bitgo.createTransactionBuilderForNetwork(network);

    inputs.forEach((input) => {
      let prevOutScript: Buffer | undefined;
      if (input.scriptPubKey) {
        prevOutScript = Buffer.from(input.scriptPubKey, 'hex');
      }
      txb.addInput(input.txid, input.vout || 0, input.sequence, prevOutScript);
    });
    outputs.forEach((output: { address: string; value: number }) => {
      if (!output.address && output.value < dustLimit) return;
      txb.addOutput(output.address || changer, output.value);
    });

    return {
      serialized: txb.buildIncomplete().toHex(),
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
    const txb = bitgo.createTransactionBuilderFromTransaction(tx);

    const signatures: Signature[] = [];
    for (let i = 0; i < tx.ins.length; i++) {
      const { hash, index } = txb.tx.ins[i];
      const txid = this.getTxId(hash);
      const utxo = utxoMap.get(this.getUtxoKey({ txid, vout: index }));
      if (!utxo) {
        throw new AppError(errors.NO_MATCHING_UTXO_FOUND, {
          details: `${errors.NO_MATCHING_UTXO_FOUND.details}: ${txid}-${index}`,
        });
      }

      const { redeemScript, signers } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      for (const pub of signers!) {
        const pubKey = Buffer.from(pub, 'hex');
        const { signatureHash } = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType);
        signatures.push({
          pubKey: pub,
          hash: signatureHash.toString('hex'),
        });
      }
    }

    return {
      serialized,
      signatures,
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
    const txb = bitgo.createTransactionBuilderFromTransaction(tx);

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
      const { signers = [], redeemScript } = utxo;
      const redeemScriptBuffer = redeemScript ? Buffer.from(redeemScript, 'hex') : undefined;
      const prepare = signers[0];
      const pubKey = Buffer.from(prepare, 'hex');
      const { signatureHash } = txb.getSigningData(i, pubKey, redeemScriptBuffer, hashType);

      const related = signatures.filter((sig) => sig.hash === signatureHash.toString('hex'));
      if (!related.length) throw new AppError(errors.INVALID_SIGNATURES);

      for (const { signature, pubKey } of related!) {
        const pubKeyBuf = Buffer.from(pubKey!, 'hex');
        const key = ec.keyFromPublic(pubKeyBuf, 'hex');
        if (!signature) {
          throw new AppError(errors.VERIFY_SIGNATURE_FAILED);
        }
        const { r, s } = parseSignature(signature!);
        const ecSignature = new ECSignature({ r, s });

        if (!key.verify(signatureHash, ecSignature)) throw new AppError(errors.VERIFY_SIGNATURE_FAILED);
        txb.signInput(i, pubKeyBuf, Buffer.from(r + s, 'hex'), hashType);
      }
    }
    const utxoTx = txb.build();
    return {
      hash: utxoTx.getId(),
      serialized: utxoTx.toHex(),
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

  getNetWork({ scriptHash, pubKeyHash, coin, forkChain }: Network): BitgoNetwork {
    const bitgoNetwork: any = Object.values(networks).find(
      (network: any) => network.scriptHash === Number(scriptHash) && network.pubKeyHash === Number(pubKeyHash) && network.coin === coin,
    );
    let forkNetwork = bitgoNetwork || (forkChain && networks[forkChain]) || networks.bitcoin;

    const network = {
      ...forkNetwork,
      scriptHash: Number(scriptHash),
      pubKeyHash: Number(pubKeyHash),
      coin,
      forkChain: forkNetwork,
    };
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

      const { scriptPubKey, redeemScript } = utxo;
      if (!scriptPubKey) return;

      const type: string = classify.output(Buffer.from(scriptPubKey, 'hex'));
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
}

export const provider = new Provider();
