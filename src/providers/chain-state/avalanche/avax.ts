import { isNil } from 'lodash';
import { URL } from 'url';
import createHash from 'create-hash';
import { Avalanche, avm, BinTools, utils, Buffer, BN, common } from 'avalanche';
import { Validator } from '@src/utils/ajv';
import { AppError, errors } from '@src/error';

import {
  Network,
  DeployAccountRequest,
  DecodeTransactionRequest,
  BuildAVAXTransferTransactionRequest,
  SignTransactionRequest,
  SendTransactionRequest,
  TransactionParams,
} from '@src/__proto__/avalanche/avax/types';
import { TransactionReply } from '@src/__proto__/common/types';
import {
  AvalancheRefSchema,
  DecodeTransactionRequestSchema,
  BuildAVAXTransferTransactionSchema,
  DeployAccountRequestSchema,
  SignTransactionRequestSchema,
  SendTransactionRequestSchema,
} from './avax.schema';

const validator = new Validator({ schemas: [AvalancheRefSchema] });

const { Defaults, Serialization } = utils;
const {
  KeyPair,
  UTXOSet,
  SECPTransferInput,
  TransferableInput,
  BaseTx,
  UnsignedTx,
  SECPTransferOutput,
  TransferableOutput,
  SelectCredentialClass,
} = avm;

const { Signature } = common;
const bintools = BinTools.getInstance();

export class Provider {
  deployAccount(req: DeployAccountRequest): string {
    validator.assert(DeployAccountRequestSchema, req);

    const { key, network: reqNetWork } = req as Required<DeployAccountRequest>;
    const pubk = Buffer.from(key, 'hex');

    const avalanche = this.getReqProvider(reqNetWork!);

    const xChain = avalanche.XChain();
    const keyChain = xChain.keyChain();
    const kp = keyChain.makeKey();
    const addr = KeyPair.addressFromPublicKey(pubk);

    return xChain.addressFromBuffer(addr);
  }

  async buildAVAXTransferTransaction(req: BuildAVAXTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildAVAXTransferTransactionSchema, req);

    const { utxos: reqUTXOs, recipients, network, change, params = {} } = req as Required<BuildAVAXTransferTransactionRequest>;
    const avalanche = this.getReqProvider(network!);
    const networkId = network?.networkId!;
    const xChain = avalanche.XChain();
    const blockchainId = xChain.getBlockchainID();

    const avaxAssetID = Defaults.network[networkId].X.avaxAssetID;
    if (!avaxAssetID) throw new AppError(errors.INVALID_ARGUMENT, { details: `unsupported network ${networkId}` });
    const avaxAssetIDBuffer = bintools.cb58Decode(avaxAssetID);

    const dustLimit = xChain.getTxFee();
    const fee = this.getReqTxFee(params!, xChain);
    const outputs: avm.TransferableOutput[] = [];
    const inputs: avm.TransferableInput[] = [];

    const utxoSet = new UTXOSet();
    const data = reqUTXOs.map((item) => item.utxo!).filter((v) => !isNil(v));

    utxoSet.addArray(data.flat(), false);

    let totalInputAmount = new BN(0);
    let totalOutputAmount = new BN(0);
    const utxos: avm.UTXO[] = utxoSet.getAllUTXOs();
    utxos.forEach((utxo: avm.UTXO, index: number) => {
      const amountOutput: avm.AmountOutput = utxo.getOutput() as avm.AmountOutput;
      const amt: BN = amountOutput.getAmount().clone();
      const txid: Buffer = utxo.getTxID();
      const outputidx: Buffer = utxo.getOutputIdx();

      const secpTransferInput: avm.SECPTransferInput = new SECPTransferInput(amt);
      const addresses = reqUTXOs[index].addresses || [];
      addresses.forEach((addr) => {
        secpTransferInput.addSignatureIdx(0, xChain.parseAddress(addr));
      });

      const input: avm.TransferableInput = new TransferableInput(txid, outputidx, avaxAssetIDBuffer, secpTransferInput);
      inputs.push(input);
      totalInputAmount = totalInputAmount.add(amt);
    });

    recipients.forEach((receipt) => {
      const { addresses, threshold } = receipt;
      const locktime = new BN(receipt?.locktime || 0);
      const amount = new BN(receipt.amount!);
      const toAddresses = addresses!.map((addr) => xChain.parseAddress(addr));
      const secpTransferOutput = new SECPTransferOutput(amount, toAddresses, locktime, threshold || 1);
      const transferableOutput = new TransferableOutput(avaxAssetIDBuffer, secpTransferOutput);

      outputs.push(transferableOutput);
      totalOutputAmount = totalOutputAmount.add(amount);
    });

    if (change && change.addresses && totalInputAmount.sub(totalOutputAmount).sub(fee).gte(dustLimit)) {
      const { addresses, threshold } = change;
      const locktime = new BN(change?.locktime || 0);
      const amount = new BN(change.amount!);
      const toAddresses = addresses!.map((addr) => xChain.parseAddress(addr));
      const secpTransferOutput = new SECPTransferOutput(amount, toAddresses, locktime, threshold || 1);
      const transferableOutput = new TransferableOutput(avaxAssetIDBuffer, secpTransferOutput);

      outputs.push(transferableOutput);
    }

    const memo = params?.memo ? Buffer.from(params?.memo!) : undefined;

    const baseTx = new BaseTx(networkId, bintools.cb58Decode(blockchainId), outputs, inputs, memo);

    const unsignedTx = new UnsignedTx(baseTx);

    const serialized = unsignedTx.toBuffer().toString('hex');
    const msg = Buffer.from(createHash('sha256').update(unsignedTx.toBuffer()).digest());
    const signature = { hash: msg.toString('hex') };
    return {
      serialized,
      signatures: [signature],
    };
  }

  async signTransaction(req: SignTransactionRequest): Promise<TransactionReply> {
    validator.assert(SignTransactionRequestSchema, req);

    const { serialized: serializedTx, network, signatures, utxos } = req as Required<SignTransactionRequest>;

    const avalanche = this.getReqProvider(network!);
    const xChain = avalanche.XChain();
    const keyChain = xChain.keyChain();
    const kp = keyChain.makeKey();

    const map = signatures.reduce<Record<string, string>>((acc, cur) => {
      const { pubKey, signature } = cur;
      const pubk = Buffer.from(pubKey!, 'hex');

      const addr = KeyPair.addressFromPublicKey(pubk);
      const address = xChain.addressFromBuffer(addr);
      acc[address] = signature!;
      return acc;
    }, {});

    const unsignedTx = new avm.UnsignedTx();
    unsignedTx.fromBuffer(Buffer.from(serializedTx, 'hex'));

    const sigs: common.Credential[] = [];

    const transaction = unsignedTx.getTransaction();
    const ins = transaction.getIns();

    for (let i = 0; i < ins.length; i += 1) {
      const input = ins[i];
      const utxo = utxos[i];

      const cred = SelectCredentialClass(input.getInput().getCredentialID());

      const addresses = utxo.addresses || [];
      for (let j = 0; j < addresses.length; j++) {
        const address = addresses[j];
        const signval = map[address];
        if (!signval) throw new AppError(errors.INVALID_ARGUMENT, { details: `require ${address} signature` });

        const sig = new Signature();
        sig.fromBuffer(Buffer.from(signval, 'hex'));
        cred.addSignature(sig);
      }
      sigs.push(cred);
    }

    const tx = new avm.Tx(unsignedTx, sigs);
    const txBuffer = tx.toBuffer();
    const buffer = Buffer.from(createHash('sha256').update(txBuffer).digest().buffer);
    const serialization = Serialization.getInstance();
    const txid = serialization.bufferToType(buffer, 'cb58');

    return {
      hash: txid,
      serialized: txBuffer.toString('hex'),
    };
  }

  async sendTransaction(req: SendTransactionRequest): Promise<TransactionReply> {
    validator.assert(SendTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;

    const avalanche = this.getReqProvider(network!);
    const xChain = avalanche.XChain();

    const serializedTx = Buffer.from(serialized, 'hex');
    const txid = await xChain.issueTx(serializedTx);

    return {
      hash: txid,
    };
  }

  async decodeTransaction(req: DecodeTransactionRequest): Promise<TransactionParams> {
    validator.assert(DecodeTransactionRequestSchema, req);

    const { serialized, network } = req as Required<SendTransactionRequest>;
    const networkId = network?.networkId!;

    const avaxAssetID = Defaults.network[networkId].X.avaxAssetID;
    if (!avaxAssetID) throw new AppError(errors.INVALID_ARGUMENT, { details: `unsupported network ${networkId}` });
    const avaxAssetIDBuffer = bintools.cb58Decode(avaxAssetID);

    const serializedTx = Buffer.from(serialized, 'hex');

    const tx = new avm.Tx();
    tx.fromBuffer(serializedTx);

    const unsignedTx = tx.getUnsignedTx();
    const transaction = unsignedTx.getTransaction();
    const memo = transaction.getMemo().toString('hex');

    const fee = unsignedTx.getInputTotal(avaxAssetIDBuffer).sub(unsignedTx.getOutputTotal(avaxAssetIDBuffer)).toString();

    return {
      fee,
      memo,
    };
  }

  getReqProvider(network: Network) {
    let host = '';
    let port = -1;
    let protocol = 'https';
    let networkId = network?.networkId;
    if (network.provider) {
      const url = new URL(network.provider);
      host = url.href.substring(url.protocol.length + 2);
      protocol = url.protocol.substr(0, url.protocol.length - 1);
    }
    return new Avalanche(host, port, protocol, networkId);
  }

  getReqTxFee(params: TransactionParams, xchain: avm.AVMAPI): BN {
    let fee = new BN(params?.fee || 0);
    if (fee.lten(0)) {
      fee = xchain.getTxFee();
    }
    return fee;
  }

  getReqAssetID(assetId: string, utxoSet: avm.UTXOSet) {
    let assertId: Buffer;
    if (assetId) {
      assertId = bintools.cb58Decode(assetId);
    } else {
      const allUTXOs = utxoSet.getAllUTXOs();
      assertId = allUTXOs[0].getAssetID();
    }
    return assertId;
  }
}

export const provider = new Provider();
