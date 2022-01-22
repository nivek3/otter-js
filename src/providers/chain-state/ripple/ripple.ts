import BN from 'bn.js';
import hashjs from 'hash.js';
import { get, omit, cloneDeep, isNil, pickBy } from 'lodash';
import { ec as EC } from 'elliptic';
import { stripHexPrefix } from 'ethereumjs-util';
import { APIOptions, RippleAPI, TransactionJSON } from 'ripple-lib';
import { setCanonicalFlag } from 'ripple-lib/dist/npm/transaction/utils';
import { JsonObject } from 'ripple-binary-codec/dist/types/serialized-type';
import { deriveAddress } from 'ripple-keypairs';
import { hexToBytes } from 'ripple-keypairs/dist/utils';
import rippleBinaryCodec from 'ripple-binary-codec';
import { canonicalSignature } from './../../../utils/signature';
import { compareSigners } from './util';
import { ApiCache } from './cache';

import { Signature, TransactionReply } from '../../../__proto__/common/types';
import {
  Account,
  TransactionParams,
  DeployAccountRequest,
  BuildPaymentTransactionRequest,
  BuildAccountSetTransactionRequest,
  BuildSignerListSetTransactionRequest,
  HashForSignatureRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  DecodeTransactionRequest,
  RebuildTransactionRequest,
} from '../../../__proto__/ripple/types';

const ECSignature = require('elliptic/lib/elliptic/ec/signature');
const ec = new EC('secp256k1');
export class Provider {
  apis: ApiCache;

  constructor(apiMaxAge = 1000 * 60 * 60) {
    this.apis = new ApiCache({ maxAge: apiMaxAge });
  }

  async deployAccount(req: DeployAccountRequest): Promise<string> {
    const { key } = req as Required<DeployAccountRequest>;
    return deriveAddress(key);
  }

  async buildPaymentTransaction(req: BuildPaymentTransactionRequest): Promise<TransactionReply> {
    const { from, quantity, destination, destinationTag, params, network, signersCount } = req as Required<BuildPaymentTransactionRequest>;
    const api = await this.getApi(network?.provider);
    const address = this.getAccountAddress(from!);
    let tx: TransactionJSON = {
      TransactionType: 'Payment',
      Account: address!,
      Amount: quantity,
      Destination: destination,
      DestinationTag: destinationTag,
    };

    tx = this.setTxParams(tx, params);
    tx = await this.prepareTransaction(api, tx, { signersCount });
    const serialized = rippleBinaryCodec.encode(tx);

    return {
      serialized,
    };
  }

  async hashForSignature(req: HashForSignatureRequest) {
    const { serialized, accounts, signersCount } = req as Required<HashForSignatureRequest>;
    const tx: JsonObject = rippleBinaryCodec.decode(serialized);
    let signatures: Signature[];
    let signers;
    if (!(Array.isArray(accounts) && accounts.length)) throw new Error('please provider accounts');

    if (signersCount) {
      const result = this.getMultisigSignaturesAndSigners(tx, accounts);
      signatures = result.signatures;
      signers = result.signers;
      tx.Signers = signers;
    } else {
      const account = accounts[0];
      const signature = this.getAccountSignature(tx, account);
      signatures = [signature];
    }

    const serializedTx = rippleBinaryCodec.encode(tx);
    return {
      serialized: serializedTx,
      signatures,
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    const { serialized, signatures } = req as Required<SignTransactionRequest>;
    const tx = rippleBinaryCodec.decode(serialized);
    const signedTx = tx.Signers
      ? this.combineMultisigTx(tx, signatures) // multisig
      : this.signTx(tx, signatures[0]); // account sig
    const serializedTx = rippleBinaryCodec.encode(signedTx);
    const hash = RippleAPI.computeBinaryTransactionHash(serializedTx);
    return {
      serialized: serializedTx,
      hash: hash,
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    const { serialized, network } = req as Required<SendTransactionRequest>;
    const api = await this.getApi(network?.provider);
    const result = await api.submit(serialized);
    if (result.resultCode !== 'tesSUCCESS') throw new Error(result.resultMessage);

    return {
      hash: get(result, 'tx_json.hash'),
    };
  }

  async buildAccountSetTransaction(req: BuildAccountSetTransactionRequest): Promise<TransactionReply> {
    const { account, network, signersCount, setFlag, clearFlag, params } = req as Required<BuildAccountSetTransactionRequest>;
    const api = await this.getApi(network?.provider);
    const address = this.getAccountAddress(account!);
    let tx: TransactionJSON = {
      TransactionType: 'AccountSet',
      Account: address!,
    };

    Object.assign(tx, {
      SetFlag: setFlag,
      ClearFlag: clearFlag,
    });

    tx = this.setTxParams(tx, params);
    tx = await this.prepareTransaction(api, tx, { signersCount });
    const serialized = rippleBinaryCodec.encode(tx);
    return {
      serialized,
    };
  }

  async buildSignerListSetTransaction(req: BuildSignerListSetTransactionRequest): Promise<TransactionReply> {
    const { account, network, signersCount, signerEntries, signerQuorum, params } = req as Required<BuildSignerListSetTransactionRequest>;
    const api = await this.getApi(network?.provider);
    const address = this.getAccountAddress(account!);
    let tx: TransactionJSON = {
      TransactionType: 'SignerListSet',
      Account: address!,
      SignerQuorum: signerQuorum,
    };

    if (Array.isArray(signerEntries) && signerEntries.length) {
      tx.SignerEntries = signerEntries.map((entry) => {
        return {
          SignerEntry: {
            Account: entry.account!,
            SignerWeight: entry.signerWeight,
          },
        };
      });
    }
    tx = this.setTxParams(tx, params);
    tx = await this.prepareTransaction(api, tx, { signersCount });
    const serialized = rippleBinaryCodec.encode(tx);
    return {
      serialized,
    };
  }

  decodeTransaction(req: DecodeTransactionRequest): TransactionParams {
    const { serialized } = req as Required<DecodeTransactionRequest>;
    const tx = rippleBinaryCodec.decode(serialized) as TransactionJSON;
    const params: TransactionParams = {
      sequence: tx.Sequence?.toString(),
      fee: tx.Fee?.toString(),
      lastLedgerSequence: tx.LastLedgerSequence?.toString(),
    };
    return params;
  }

  async rebuildTransaction(req: RebuildTransactionRequest) {
    const { serialized, params } = req as Required<RebuildTransactionRequest>;
    let tx = rippleBinaryCodec.decode(serialized) as TransactionJSON;

    tx = this.setTxParams(tx, params);
    const json = omit(tx, ['SigningPubKey', 'TxnSignature', 'Signers']);

    return {
      serialized: rippleBinaryCodec.encode(json),
    };
  }

  getSignatureKey(pubKey: string, hash: string) {
    return pubKey + hash;
  }

  getMultisigSignaturesAndSigners(tx: JsonObject, accounts: Account[]) {
    tx.SigningPubKey = '';
    return accounts.reduce<{
      signatures: Signature[];
      signers: unknown[];
    }>(
      (prev, account) => {
        const address = this.getAccountAddress(account);
        const pubKey = account?.pubKey;
        const tmpTx = cloneDeep(tx);
        const signingData = rippleBinaryCodec.encodeForMultisigning(tmpTx, address);
        const signer = {
          Account: address,
          SigningPubKey: pubKey,
          TxnSignature: '',
        };
        const signature = {
          hash: this.hash(hexToBytes(signingData)),
          pubKey,
        };
        prev.signatures.push(signature);
        prev.signers.push({ Signer: signer });
        return prev;
      },
      { signatures: [], signers: [] },
    );
  }

  getAccountSignature(tx: JsonObject, account: Account) {
    const { pubKey } = account;
    tx.SigningPubKey = pubKey;
    const signingData = rippleBinaryCodec.encodeForSigning(tx);
    const signature = {
      hash: this.hash(hexToBytes(signingData)),
      pubKey,
    };
    return signature;
  }

  signTx(tx: JsonObject, signature: Signature) {
    const stripedSignature = stripHexPrefix(signature.signature!);
    tx.TxnSignature = this.canonicalAndToDER(stripedSignature);
    return tx;
  }

  combineMultisigTx(tx: JsonObject, signatures: Signature[]): JsonObject {
    const originTx = omit(tx, 'Signers');
    const sigMap = signatures.reduce<Record<string, string>>((prev, cur) => {
      const { pubKey, hash, signature } = cur;
      const key = this.getSignatureKey(pubKey!.toUpperCase(), hash!);
      prev[key] = signature!;
      return prev;
    }, {});

    const unsortedSigners = tx.Signers! as any[];
    unsortedSigners.forEach((signer) => {
      const { SigningPubKey, Account } = signer.Signer;
      const signingData = rippleBinaryCodec.encodeForMultisigning(originTx, Account);
      const hash = this.hash(hexToBytes(signingData));
      const key = this.getSignatureKey(SigningPubKey!, hash);
      const signature = sigMap[key];
      if (!signature) throw new Error('Unmatched signature');

      const stripedSignature = stripHexPrefix(signature!);
      signer.Signer.TxnSignature = this.canonicalAndToDER(stripedSignature);
    });

    const signers = unsortedSigners.sort(compareSigners);
    const signedTx = Object.assign({}, tx, { Signers: signers });
    return signedTx;
  }

  setTxParams(tx: TransactionJSON, params: TransactionParams | null | undefined) {
    params = params || {};
    const extra = {
      Fee: params?.fee,
      Sequence: params?.sequence,
      LastLedgerSequence: params?.lastLedgerSequence,
    };
    return Object.assign(
      tx,
      pickBy(extra, (val) => !isNil(val)),
    );
  }

  async prepareTransaction(api: RippleAPI, tx: TransactionJSON, metadata?: Record<string, any>) {
    if (['LastLedgerSequence', 'Fee', 'Sequence'].find((prop) => tx[prop] === undefined)) {
      const prepare = await api.prepareTransaction(tx, {
        signersCount: metadata?.signersCount,
        maxLedgerVersionOffset: metadata?.maxLedgerVersionOffset || 75,
      });
      tx = JSON.parse(prepare.txJSON);
    }
    if (!tx.Flags) {
      setCanonicalFlag(tx);
    }
    return tx;
  }

  private async getApi(provider?: string, timeout = 3 * 1000) {
    const endpoint = provider || '';
    let api = this.apis.get(endpoint);
    if (api) return api;

    const options: APIOptions = {};
    if (endpoint) {
      options.server = provider;
    }
    api = new RippleAPI({ server: provider });

    let timer: NodeJS.Timeout;
    const proctored = new Promise<true>((resolve) => {
      timer = setTimeout(() => {
        resolve(true);
      }, timeout);
    });
    const failed = await Promise.race([
      provider ? api.connect() : Promise.resolve(), //
      proctored,
    ]);
    if (failed) {
      await api.disconnect().catch();
      throw new Error('can not create the api');
    }
    this.apis.set(endpoint, api);
    return api;
  }

  private hash(bytes: number[]): string {
    const digest = hashjs.sha512().update(bytes).digest().slice(0, 32);
    return new BN(digest).toString(16);
  }

  getAccountAddress({ pubKey, address }: Account) {
    if (!address) {
      address = deriveAddress(pubKey);
    }
    return address;
  }

  canonicalAndToDER(signature: string) {
    const parsed = canonicalSignature(signature);
    const r = new BN(parsed.r!, 'hex');
    const s = new BN(parsed.s!, 'hex');
    const recoveryParam = parsed.v!;
    const sig = new ECSignature({
      r,
      s,
      recoveryParam,
    });
    return new BN(sig.toDER()).toString('hex').toUpperCase();
  }
}

export const provider = new Provider();
