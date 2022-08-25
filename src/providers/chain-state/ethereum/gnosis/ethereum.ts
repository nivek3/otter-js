import Web3 from 'web3';
import { utils, BigNumber } from 'ethers';
import { toBN } from 'web3-utils';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { splitSignature, joinSignature, isHexString, hexValue } from '@ethersproject/bytes';
import { TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData } from '@ethereumjs/tx';

import { stripHexPrefix, addHexPrefix } from 'ethereumjs-util';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply, Signature } from '@src/__proto__/common/types';
import {
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildMultisigTransferInputRequest,
  SignMultisigInputRequest,
  BuildMultisigTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  BuildMultisigInputRequest,
  BuildMultiSendInputRequest,
  BuildSafeInputReply,

  // owner manger
  BuildAddOwnerWithThresholdInputRequest,
  BuildChangeThresholdInputRequest,
  BuildRemoveOwnerInputRequest,
  BuildSwapOwnerInputRequest,
} from '@src/__proto__/ethereum/gnosis/types';
import { canonicalSignature } from '@src/utils/signature';

import { pubToBIP55Address } from '../common/utils';
import { Provider as CoreProvider } from '../core/ethereum';

import {
  ZERO_ADDRESS,
  buildSafeTransaction,
  buildSignatureBytes,
  calculateSafeTransactionHash,
  populatedResolvedNames,
  safeApproveHash,
  decodeSafeApproveHashAddress,
  SafeTransaction,
  encodeMultiSend,
  // gnosis contract abi and address
  safeSingleton,
  safeSingletonABI,
  compatHandler,
  proxyFactory,
  proxyFactoryABI,
  multiSendCall,
  multiSendCallABI,
} from './gnosis';
import {
  EthereumRefSchema,
  GetAccountRequestSchema,
  BuildMultisigInputRequestSchema,
  BuildAccountTransactionRequestSchema,
  SignMultisigInputRequestSchema,
  BuildMultisigTransferInputRequestSchema,
  BuildMultisigERC20TransferInputRequestSchema,
  BuildMultisigTransactionRequestSchema,
  BuildMultiSendInputRequestSchema,

  // owner manger
  BuildAddOwnerWithThresholdInputRequestSchema,
  BuildChangeThresholdInputRequestSchema,
  BuildRemoveOwnerInputRequestSchema,
  BuildSwapOwnerInputRequestSchema,
} from './ethereum.schema';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const Contract = require('web3-eth-contract');

const validator = new Validator({ schemas: [EthereumRefSchema], allowUnionTypes: true });

export class Provider extends CoreProvider {
  async getAccountAddress(req: GetAccountAddressRequest): Promise<GetAccountAddressReply> {
    validator.assert(GetAccountRequestSchema, req);

    const { network, threshold, keys, saltNonce } = req as Required<GetAccountAddressRequest>;
    const { provider, chainId } = network!;
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const web3 = new Web3(provider!);
    const { address } = await this.getSetupTxData(web3, chainId, keys, threshold, BigNumber.from(saltNonce!));

    return {
      address,
      saltNonce,
    };
  }

  async buildMultisigTransaction(req: BuildMultisigTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransactionRequestSchema, req);

    const { network, contract, sender, params, value } = req as Required<BuildMultisigTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const data = addHexPrefix(stripHexPrefix(req.data!));

    const txInput: FactoryTxData = {
      to: contract,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    };
    return this.getTransactionReply(txInput, txOptions, web3, sender, params!);
  }

  // owner manger
  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
    validator.assert(BuildAccountTransactionRequestSchema, req);

    const { threshold, keys, sender, network, params } = req as Required<BuildAccountTransactionRequest>;
    const { provider, chainId } = network!;
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const saltNonce = this.getReqSaltNonce(req.saltNonce?.toString());

    const { address, input, proxyFactoryAddress } = await this.getSetupTxData(web3, chainId, keys, threshold, saltNonce);

    const txInput = {
      data: input,
      to: proxyFactoryAddress,
    };
    const reply = await this.getTransactionReply(txInput, txOptions, web3, sender, params!);

    return {
      address,
      ...reply,
    };
  }

  async buildAddOwnerWithThresholdInput(req: BuildAddOwnerWithThresholdInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildAddOwnerWithThresholdInputRequestSchema, req);
    const { network, owner, threshold, contract, value, participants, sender } = req as Required<BuildAddOwnerWithThresholdInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const nonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('addOwnerWithThreshold', [owner, threshold]);
    const safeTx = buildSafeTransaction({
      to: contract,
      nonce,
      data,
      value,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildChangeThresholdInput(req: BuildChangeThresholdInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildChangeThresholdInputRequestSchema, req);
    const { network, threshold, contract, value, participants, sender } = req as Required<BuildChangeThresholdInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const nonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('changeThreshold', [threshold]);
    const safeTx = buildSafeTransaction({
      to: contract,
      nonce,
      data,
      value,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildRemoveOwnerInput(req: BuildRemoveOwnerInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildRemoveOwnerInputRequestSchema, req);
    const { network, contract, value, prevOwner, owner, threshold, participants, sender } = req as Required<BuildRemoveOwnerInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const nonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('removeOwner', [prevOwner, owner, threshold]);
    const safeTx = buildSafeTransaction({
      to: contract,
      nonce,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildSwapOwnerInput(req: BuildSwapOwnerInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildSwapOwnerInputRequestSchema, req);
    const { network, contract, value, prevOwner, oldOwner, newOwner, participants, sender } = req as Required<BuildSwapOwnerInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const nonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('swapOwner', [prevOwner, oldOwner, newOwner]);
    const safeTx = buildSafeTransaction({
      to: contract,
      nonce,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildMultisigInput(req: BuildMultisigInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildMultisigInputRequestSchema, req);

    const { network, value, to, data, contract, participants, sender } = req as Required<BuildMultisigInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const multiSigContractNonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      to,
      value: isHexString(value) ? hexValue(value) : value,
      nonce: multiSigContractNonce,
      data,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildMultisigTransferInput(req: BuildMultisigTransferInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildMultisigTransferInputRequestSchema, req);

    const { network, toAddress, value, contract, participants, sender } = req as Required<BuildMultisigTransferInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const safeContractNonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      to: toAddress,
      value: isHexString(value) ? hexValue(value) : value,
      nonce: safeContractNonce,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  signMultisigInput(req: SignMultisigInputRequest): BuildSafeInputReply {
    validator.assert(SignMultisigInputRequestSchema, req);

    const serialized = this.signExecFunctionInput(req.serialized!, req.signatures!);
    return {
      serialized: stripHexPrefix(serialized),
    };
  }

  async buildMultisigERC20TransferInput(req: BuildMultisigERC20TransferInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildMultisigERC20TransferInputRequestSchema, req);

    const { toAddress, quantity, tokenAddress, contract, participants, sender } = req as Required<BuildMultisigERC20TransferInputRequest>;
    const { chainId, provider } = req.network!;
    const web3 = new Web3(provider!);

    const data = this.encodeERC20Method('transfer', [toAddress, quantity]);

    const safeContractNonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);

    const safeTx = buildSafeTransaction({
      to: tokenAddress,
      data,
      nonce: safeContractNonce,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  async buildMultiSendInput(req: BuildMultiSendInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildMultiSendInputRequestSchema, req);

    const { network, contract, txs, participants, sender, value } = req as Required<BuildMultiSendInputRequest>;
    const { multiSendCallABI, multiSendCallAddress } = this.getGnosisAddresses(network?.chainId!);
    const { chainId, provider } = req.network!;
    const web3 = new Web3(provider!);
    const transactions = txs.map((tx) => {
      return buildSafeTransaction({
        to: tx.to!,
        value: tx.value && isHexString(tx.value) ? hexValue(tx.value) : tx.value,
        data: tx.data ? addHexPrefix(tx.data) : '',
        nonce: 0,
        operation: 0,
      });
    });
    const transaction = encodeMultiSend(transactions);
    const iface = new utils.Interface(multiSendCallABI);
    const data = iface.encodeFunctionData('multiSend', [transaction]);
    const multiSigContractNonce = await this.getSafeContractNonce(contract, web3, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      to: multiSendCallAddress,
      operation: 1,
      data,
      nonce: multiSigContractNonce,
      value,
    });
    return this.getSafeTxInputReply(web3, chainId!, safeTx, contract, participants, sender);
  }

  getGnosisAddresses(chainId: number) {
    const safeSingletonAddress = safeSingleton?.networkAddresses[chainId];
    const compatHandlerAddress = compatHandler?.networkAddresses[chainId];
    const proxyFactoryAddress = proxyFactory?.networkAddresses[chainId];
    const multiSendCallAddress = multiSendCall?.networkAddresses[chainId];

    if (
      !safeSingletonABI ||
      !safeSingletonAddress ||
      !compatHandlerAddress ||
      !proxyFactoryAddress ||
      !multiSendCallAddress ||
      !multiSendCallABI
    ) {
      throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid chainId' });
    }
    return { safeSingletonABI, safeSingletonAddress, compatHandlerAddress, proxyFactoryAddress, multiSendCallAddress, multiSendCallABI };
  }

  getReqSaltNonce(saltNonce?: number | string): BigNumber {
    return BigNumber.from(saltNonce || Date.now());
  }

  async getDeployCode(web3: Web3, proxyFactoryABI: any, proxyFactoryAddress: string, safeSingletonAddress: string) {
    const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
    proxyFactoryContract.setProvider(web3.currentProvider);
    const creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
    return utils.solidityPack(['bytes', 'uint256'], [creationCode, safeSingletonAddress]);
  }

  async getSafeContractNonce(multiSigAddress: string, web3: Web3, multiSigContractNonce?: number) {
    if (multiSigContractNonce === undefined) {
      const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
      multisigContract.setProvider(web3.currentProvider);
      multiSigContractNonce = await multisigContract.methods.nonce().call('pending');
    }
    return toBN(multiSigContractNonce!).toNumber();
  }

  getSafeAddress(proxyFactoryAddress: string, initializer: string, deploymentCode: string, saltNonce: BigNumber) {
    const salt = utils.solidityKeccak256(['bytes32', 'uint256'], [utils.solidityKeccak256(['bytes'], [initializer]), saltNonce]);
    return utils.getCreate2Address(proxyFactoryAddress, salt, utils.keccak256(deploymentCode));
  }

  signExecFunctionInput(serialized: string, signatures: Signature[]) {
    const participants = signatures.map((sig) => {
      const { signature, pubKey } = sig;
      const { r, s, v } = canonicalSignature(signature!);
      return {
        signer: pubToBIP55Address(pubKey!),
        data: joinSignature(splitSignature({ r: addHexPrefix(r), s: addHexPrefix(s), recoveryParam: v })),
      };
    });

    const { safeTx, signatures: approve } = this.decodeExecFunctionData(serialized);
    if (stripHexPrefix(approve)) {
      const sender = decodeSafeApproveHashAddress(approve);
      participants.push(safeApproveHash(sender));
    }
    const signatureBytes = buildSignatureBytes([...participants]);
    return this.encodeExecTransaction(safeTx, signatureBytes);
  }

  async getSetupTxData(web3: Web3, chainId: number, keys: string[], threshold: number, saltNonce: BigNumber) {
    const { safeSingletonABI, safeSingletonAddress, compatHandlerAddress, proxyFactoryAddress } = this.getGnosisAddresses(chainId);

    const owners = keys.map(pubToBIP55Address);
    const methodParams = [
      owners,
      threshold,
      ZERO_ADDRESS,
      '0x',
      compatHandlerAddress, // fallback handler
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS,
    ];

    const safeSingletonContract = new Contract(safeSingletonABI);

    const initializer = safeSingletonContract.methods.setup(...methodParams).encodeABI();

    const proxyFactoryContract = new Contract(proxyFactoryABI);

    const deployCode = await this.getDeployCode(web3, proxyFactoryABI, proxyFactoryAddress, safeSingletonAddress);
    const address = this.getSafeAddress(proxyFactoryAddress, initializer, deployCode, saltNonce);

    const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, saltNonce).encodeABI();
    return { address, proxyFactoryAddress, input };
  }

  async getSafeTxHashAndTransactionData(web3: Web3, chainId: number, verifyingContract: string, safeTx: SafeTransaction, sender?: string) {
    const domain = { verifyingContract, chainId };
    const populated = await populatedResolvedNames(domain, safeTx, web3);
    const safeHash = calculateSafeTransactionHash(populated.domain.chainId!, populated.domain.verifyingContract!, safeTx);
    let signatures = '0x';
    if (sender) {
      const approve = safeApproveHash(sender);
      signatures = approve.data;
    }
    const input = this.encodeExecTransaction(safeTx, signatures);
    return { input, safeHash };
  }

  async getSafeTxInputReply(
    web3: Web3,
    chainId: number,
    safeTx: SafeTransaction,
    verifyingContract: string,
    participants: string[] = [],
    sender?: string,
  ) {
    const { safeHash, input } = await this.getSafeTxHashAndTransactionData(web3, chainId!, verifyingContract, safeTx, sender);
    const signatures = participants.map((pubKey) => {
      return { pubKey, hash: stripHexPrefix(safeHash) };
    });
    return {
      serialized: stripHexPrefix(input),
      signatures,
      nonce: BigNumber.from(safeTx.nonce).toNumber(),
    };
  }

  async getSafeTxHash(web3: Web3, chainId: number, contract: string, safeTx: SafeTransaction) {
    const domain = { verifyingContract: contract, chainId };
    const populated = await populatedResolvedNames(domain, safeTx, web3);
    return calculateSafeTransactionHash(populated.domain.chainId!, populated.domain.verifyingContract!, safeTx);
  }

  encodeExecTransaction(safeTx: Omit<SafeTransaction, 'nonce'>, signatures: string = '0x'): string {
    const iface = new utils.Interface(safeSingletonABI);
    return iface.encodeFunctionData('execTransaction', [
      safeTx.to,
      safeTx.value,
      safeTx.data,
      safeTx.operation, // operation
      safeTx.safeTxGas, // safeTxGas
      safeTx.baseGas, // baseGas
      safeTx.gasPrice, // gasPrice
      safeTx.gasToken, // gasToken
      safeTx.refundReceiver, // refundReceiver
      signatures,
    ]);
  }

  decodeExecFunctionData(serialized: string): {
    safeTx: Omit<SafeTransaction, 'nonce'>;
    signatures: string;
  } {
    const iface = new utils.Interface(safeSingletonABI);
    const [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signatures] = iface.decodeFunctionData(
      'execTransaction',
      addHexPrefix(serialized),
    );
    const { nonce, ...safeTx } = buildSafeTransaction({
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce: -1,
    });
    return { safeTx, signatures };
  }
}

export const provider = new Provider();
