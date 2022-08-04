import Web3 from 'web3';
import { TransactionFactory, TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData } from '@ethereumjs/tx';
import ABI from 'ethereumjs-abi';
import { BN, bufferToHex, generateAddress, toChecksumAddress, Address, stripHexPrefix, addHexPrefix } from 'ethereumjs-util';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply, Signature } from '@src/__proto__/common/types';
import {
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildMultisigTransferInputRequest,
  SignMultisigTransferInputRequest,
  BuildMultisigTransferTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
} from '@src/__proto__/ethereum/bitgo/types';
import { pubToBIP55Address } from '../common/utils';
import { Provider as CoreProvider } from '../core/ethereum';
import {
  EthereumRefSchema,
  BuildAccountTransactionRequestSchema,
  SignMultisigTransferInputRequestSchema,
  BuildMultisigTransferInputRequestSchema,
  BuildMultisigERC20TransferInputRequestSchema,
  SignMultisigERC20TransferInputRequestSchema,
  BuildMultisigTransferTransactionRequestSchema,
} from './ethereum.schema';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const abiDecoder = require('abi-decoder');
const Contract = require('web3-eth-contract');
const abi = require('./abis/multisig');
const bytecode = require('./bytecodes/multisig');
const contract = new Contract(abi);
abiDecoder.addABI(abi);

const validator = new Validator({ schemas: [EthereumRefSchema] });

export class Provider extends CoreProvider {
  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
    validator.assert(BuildAccountTransactionRequestSchema, req);

    const { keys, sender, network, params } = req as Required<BuildAccountTransactionRequest>;
    const { provider } = network!;
    const txOptions = this.getTxOptions(network!);

    const web3 = new Web3(provider!);
    const addresses = keys.map(pubToBIP55Address);
    const input = contract
      .deploy({
        data: bytecode,
        arguments: [addresses],
      })
      .encodeABI();

    const txInput = {
      data: input,
    };
    const txData = await this.getTxData(txInput, txOptions.common!, web3, sender, params!);

    const from = Address.fromString(sender).toBuffer();
    const address = toChecksumAddress(bufferToHex(generateAddress(from, new BN(txData.nonce!).toBuffer())));

    const reply = await this.getTransactionReply(txData, txOptions, web3, sender, params!);
    return {
      address,
      ...reply,
    };
  }

  async buildMultisigTransferInput(req: BuildMultisigTransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferInputRequestSchema, req);

    const { toAddress, value, network } = req as Required<BuildMultisigTransferInputRequest>;

    const sequenceId = await this.getReqSequenceId(network?.provider, req?.contract, req?.sequenceId);
    const prefix = 'ETHER';
    const expireTime = req.expireTime || Math.ceil(new Date().getTime() / 1000) + 600;
    const data = req.data || '';
    const hash = this.getSha3ForConfirmationTx(
      prefix,
      toAddress,
      value,
      data,
      expireTime, //
      sequenceId,
    );
    const input = contract.methods.sendMultiSig(toAddress, value, data || '0x', expireTime, sequenceId, '0x').encodeABI();
    const signature: Signature = {
      hash: hash.toString('hex'),
    };
    return {
      serialized: stripHexPrefix(input),
      signatures: [signature],
    };
  }

  signMultisigTransferInput(req: SignMultisigTransferInputRequest): TransactionReply {
    validator.assert(SignMultisigTransferInputRequestSchema, req);
    const { serialized, signatures } = req as Required<SignMultisigTransferInputRequest>;
    const input = this.signSendMultiSigInput(serialized, signatures[0].signature!);

    return {
      serialized: stripHexPrefix(input),
    };
  }

  signSendMultiSigInput(serialized: string, signature: string): string {
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSig') throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid hash' });
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, data, expireTime, sequenceId } = params;
    return contract.methods.sendMultiSig(toAddress, quantity, data || '0x', expireTime, sequenceId, addHexPrefix(signature!)).encodeABI();
  }

  signSendMultiSigTokenInput(serialized: string, signature: string): string {
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name !== 'sendMultiSigToken') throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid hash' });
    const params = decodedData.params.reduce((accum, cur) => {
      accum[cur.name] = cur.value;
      return accum;
    }, {});
    const { toAddress, value: quantity, tokenContractAddress, expireTime, sequenceId } = params;
    return contract.methods
      .sendMultiSigToken(toAddress, quantity, tokenContractAddress, expireTime, sequenceId, addHexPrefix(signature!))
      .encodeABI();
  }

  async buildMultisigTransferTransaction(req: BuildMultisigTransferTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferTransactionRequestSchema, req);

    const { network, contract, sender, params } = req as Required<BuildMultisigTransferTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const data = addHexPrefix(stripHexPrefix(this.getReqInput(req)));

    const txInput: FactoryTxData = {
      to: contract,
      data,
    };

    const txData = await this.getTxData(txInput, common, web3, sender, params!);
    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');

    const signature = { hash };
    const estimatedFee = this.getTxEstimatedFee(tx);

    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      estimatedFee,
    };
  }

  getReqInput(req: Pick<BuildMultisigTransferTransactionRequest, 'serialized' | 'signatures' | 'data'>): string {
    const { serialized, signatures, data } = req;
    if (data) return data;

    const signature = signatures?.[0]?.signature;
    if (!(signature && serialized)) throw new AppError(errors.INVALID_ARGUMENT, { details: 'required input and signature' });
    const decodedData = abiDecoder.decodeMethod(addHexPrefix(serialized!));
    if (decodedData?.name === 'sendMultiSigToken') return this.signSendMultiSigTokenInput(serialized, signature);
    if (decodedData?.name === 'sendMultiSig') return this.signSendMultiSigInput(serialized, signature);

    throw new AppError(errors.INVALID_ARGUMENT, { details: `can not decode the hex, decode name = ${decodedData?.name}` });
  }

  async buildMultisigERC20TransferInput(req: BuildMultisigERC20TransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigERC20TransferInputRequestSchema, req);

    const { toAddress, quantity, tokenAddress, network } = req as Required<BuildMultisigERC20TransferInputRequest>;
    const sequenceId = await this.getReqSequenceId(network?.provider, req.contract, req.sequenceId);

    const expireTime = req.expireTime || Math.ceil(new Date().getTime() / 1000) + 600;
    const hash = this.getSha3ForConfirmationTokenTx(
      'ERC20',
      toAddress,
      quantity,
      tokenAddress,
      expireTime, //
      sequenceId,
    );
    const input = contract.methods.sendMultiSigToken(toAddress, quantity, tokenAddress, expireTime, sequenceId, '0x').encodeABI();
    const signature: Signature = {
      hash: hash.toString('hex'),
    };
    return {
      serialized: stripHexPrefix(input),
      signatures: [signature],
    };
  }

  signMultisigERC20TransferInput(req: SignMultisigERC20TransferInputRequest): TransactionReply {
    validator.assert(SignMultisigERC20TransferInputRequestSchema, req);

    const { serialized, signatures } = req as Required<SignMultisigERC20TransferInputRequest>;
    const input = this.signSendMultiSigTokenInput(serialized, signatures[0].signature!);

    return {
      serialized: stripHexPrefix(input),
    };
  }

  getSha3ForConfirmationTx(prefix: string, toAddress: string, value: string, data: string, expireTime: number, sequenceId: number) {
    return ABI.soliditySHA3(
      ['string', 'address', 'uint', 'string', 'uint', 'uint'], // argTypes
      [prefix, new BN(toAddress.replace('0x', ''), 16), value, data, expireTime, sequenceId],
    );
  }

  getSha3ForConfirmationTokenTx(
    prefix: string,
    toAddress: string,
    value: string,
    tokenContractAddress: string,
    expireTime: number,
    sequenceId: number,
  ) {
    return ABI.soliditySHA3(
      ['string', 'address', 'uint', 'address', 'uint', 'uint'], //
      [prefix, new BN(toAddress.replace('0x', ''), 16), value, new BN(tokenContractAddress.replace('0x', ''), 16), expireTime, sequenceId],
    );
  }
}

export const provider = new Provider();
