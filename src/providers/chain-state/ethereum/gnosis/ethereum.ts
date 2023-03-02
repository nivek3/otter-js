import { ethers, utils, BigNumber } from 'ethers';
import { toBN } from 'web3-utils';
import { splitSignature, joinSignature, isHexString, hexValue } from '@ethersproject/bytes';

import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply, Signature } from '@src/__proto__/common/types';
import {
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildTransferInputRequest,
  SignInputRequest,
  BuildTransactionRequest,
  BuildERC20TransferInputRequest,
  BuildInputRequest,
  BuildMultiSendInputRequest,
  BuildSafeInputReply,

  // multi send encode
  EncodeMultiSendRequest,
  EncodeMultiSendReply,

  // owner manger
  BuildAddOwnerWithThresholdInputRequest,
  BuildChangeThresholdInputRequest,
  BuildRemoveOwnerInputRequest,
  BuildSwapOwnerInputRequest,
} from '@src/__proto__/ethereum/gnosis/types';
import { canonicalSignature } from '@src/utils/signature';

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
  BuildInputRequestSchema,
  BuildAccountTransactionRequestSchema,
  SignInputRequestSchema,
  BuildTransferInputRequestSchema,
  BuildERC20TransferInputRequestSchema,
  BuildTransactionRequestSchema,
  BuildMultiSendInputRequestSchema,
  EncodeMultiSendRequestSchema,
  // owner manger
  BuildAddOwnerWithThresholdInputRequestSchema,
  BuildChangeThresholdInputRequestSchema,
  BuildRemoveOwnerInputRequestSchema,
  BuildSwapOwnerInputRequestSchema,
} from './ethereum.schema';

const validator = new Validator({ schemas: [EthereumRefSchema], allowUnionTypes: true });

export class Provider extends CoreProvider {
  async getAccountAddress(req: GetAccountAddressRequest): Promise<GetAccountAddressReply> {
    validator.assert(GetAccountRequestSchema, req);
    const { network = {}, threshold, keys, saltNonce } = req as Required<GetAccountAddressRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const { address, input, proxyFactoryAddress } = await this.getSetupTxData(
      provider,
      chainId,
      keys,
      threshold,
      BigNumber.from(saltNonce!),
    );

    return {
      address,
      saltNonce,
      data: stripHexPrefix(input),
      to: proxyFactoryAddress,
    };
  }

  async buildTransaction(req: BuildTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildTransactionRequestSchema, req);

    const { network, contract, sender: from, params, value } = req as Required<BuildTransactionRequest>;
    const provider = this.getReqProvider(network!);
    const data = addHexPrefix(stripHexPrefix(req.data!));

    const txInput = {
      to: contract,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    };
    return this.getTransactionReply(provider, txInput, from, params!, network!);
  }

  // owner manger
  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
    validator.assert(BuildAccountTransactionRequestSchema, req);

    const { threshold, keys, sender: from, network = {}, params } = req as Required<BuildAccountTransactionRequest>;
    const { chainId } = network!;
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const provider = this.getReqProvider(network!);
    const saltNonce = this.getReqSaltNonce(req.saltNonce?.toString());

    const { address, input, proxyFactoryAddress } = await this.getSetupTxData(provider, chainId, keys, threshold, saltNonce);

    const txInput = {
      data: input,
      to: proxyFactoryAddress,
    };
    const reply = await this.getTransactionReply(provider, txInput, from, params!, network!);

    return {
      address,
      ...reply,
    };
  }

  async buildTransferInput(req: BuildTransferInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildTransferInputRequestSchema, req);

    const { network, toAddress, value, contract, participants, sender, ...call } = req as Required<BuildTransferInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const safeContractNonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      ...call,
      to: toAddress,
      value: isHexString(value) ? hexValue(value) : value,
      nonce: safeContractNonce,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildERC20TransferInput(req: BuildERC20TransferInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildERC20TransferInputRequestSchema, req);

    const {
      toAddress,
      quantity,
      tokenAddress,
      contract,
      participants,
      sender,
      network = {},
      ...call
    } = req as Required<BuildERC20TransferInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const data = this.encodeERC20Method('transfer', [toAddress, quantity]);

    const safeContractNonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);

    const safeTx = buildSafeTransaction({
      ...call,
      to: tokenAddress,
      data,
      nonce: safeContractNonce,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildAddOwnerWithThresholdInput(req: BuildAddOwnerWithThresholdInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildAddOwnerWithThresholdInputRequestSchema, req);
    const {
      owner,
      threshold,
      contract,
      value,
      participants,
      sender,
      params,
      network = {},
      ...call
    } = req as Required<BuildAddOwnerWithThresholdInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const nonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('addOwnerWithThreshold', [owner, threshold]);
    const safeTx = buildSafeTransaction({
      ...call,
      to: contract,
      nonce,
      data,
      value,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildChangeThresholdInput(req: BuildChangeThresholdInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildChangeThresholdInputRequestSchema, req);
    const {
      threshold,
      contract,
      value,
      participants,
      sender,
      params,
      network = {},
      ...call
    } = req as Required<BuildChangeThresholdInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const nonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('changeThreshold', [threshold]);
    const safeTx = buildSafeTransaction({
      ...call,
      to: contract,
      nonce,
      data,
      value,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildRemoveOwnerInput(req: BuildRemoveOwnerInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildRemoveOwnerInputRequestSchema, req);
    const {
      contract,
      value,
      prevOwner,
      owner,
      threshold,
      participants,
      sender,
      params,
      network = {},
      ...call
    } = req as Required<BuildRemoveOwnerInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const nonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('removeOwner', [prevOwner, owner, threshold]);
    const safeTx = buildSafeTransaction({
      ...call,
      to: contract,
      nonce,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildSwapOwnerInput(req: BuildSwapOwnerInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildSwapOwnerInputRequestSchema, req);
    const {
      contract,
      value,
      prevOwner,
      oldOwner,
      newOwner,
      participants,
      sender,
      params,
      network = {},
      ...call
    } = req as Required<BuildSwapOwnerInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const nonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const iface = new utils.Interface(safeSingletonABI);
    const data = iface.encodeFunctionData('swapOwner', [prevOwner, oldOwner, newOwner]);
    const safeTx = buildSafeTransaction({
      ...call,
      to: contract,
      nonce,
      data,
      value: isHexString(value) ? hexValue(value) : value,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async buildInput(req: BuildInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildInputRequestSchema, req);

    const { value, to, data, contract, participants, sender, network = {}, ...call } = req as Required<BuildInputRequest>;
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const multiSigContractNonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      ...call,
      to,
      value: isHexString(value) ? hexValue(value) : value,
      nonce: multiSigContractNonce,
      data: data ? addHexPrefix(data) : '',
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  signInput(req: SignInputRequest): BuildSafeInputReply {
    validator.assert(SignInputRequestSchema, req);

    const serialized = this.signExecFunctionInput(req.serialized!, req.signatures!);
    return {
      serialized: stripHexPrefix(serialized),
    };
  }

  async buildMultiSendInput(req: BuildMultiSendInputRequest): Promise<BuildSafeInputReply> {
    validator.assert(BuildMultiSendInputRequestSchema, req);

    const { contract, txs, participants, sender, value, network = {}, ...call } = req as Required<BuildMultiSendInputRequest>;
    const { multiSendCallABI, multiSendCallAddress } = this.getGnosisAddresses(network?.chainId!);
    const { chainId } = network!;
    const provider = this.getReqProvider(network!);
    const transactions = txs.map((tx) => {
      return buildSafeTransaction({
        ...tx,
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
    const multiSigContractNonce = await this.getSafeContractNonce(contract, provider, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      ...call,
      to: multiSendCallAddress,
      operation: 1,
      data,
      nonce: multiSigContractNonce,
      value,
    });
    return this.getSafeTxInputReply(provider, chainId!, safeTx, contract, participants, sender);
  }

  async encodeMultiSend(req: EncodeMultiSendRequest): Promise<EncodeMultiSendReply> {
    validator.assert(EncodeMultiSendRequestSchema, req);

    const { network, txs } = req as Required<EncodeMultiSendRequest>;
    const { multiSendCallABI, multiSendCallAddress } = this.getGnosisAddresses(network?.chainId!);
    const transactions = txs.map((tx) => {
      if (tx.data) tx.data = addHexPrefix(tx.data);
      return buildSafeTransaction(tx as any);
    });
    const transaction = encodeMultiSend(transactions);
    const iface = new utils.Interface(multiSendCallABI);
    const data = iface.encodeFunctionData('multiSend', [transaction]);
    return {
      to: multiSendCallAddress,
      data: addHexPrefix(data),
    };
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

  async getDeployCode(
    provider: ethers.providers.BaseProvider,
    proxyFactoryABI: any,
    proxyFactoryAddress: string,
    safeSingletonAddress: string,
  ) {
    const proxyFactoryContract = new ethers.Contract(proxyFactoryAddress, proxyFactoryABI, provider);
    const creationCode = await proxyFactoryContract.proxyCreationCode();
    return utils.solidityPack(['bytes', 'uint256'], [creationCode, safeSingletonAddress]);
  }

  async getSafeContractNonce(multiSigAddress: string, provider: ethers.providers.BaseProvider, multiSigContractNonce?: string) {
    if (multiSigContractNonce === undefined) {
      const multisigContract = new ethers.Contract(multiSigAddress, safeSingletonABI, provider);
      multiSigContractNonce = await multisigContract.nonce({
        blockTag: 'pending',
      });
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
        signer: ethers.utils.computeAddress(addHexPrefix(pubKey!)),
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

  async getSetupTxData(provider: ethers.providers.BaseProvider, chainId: number, keys: string[], threshold: number, saltNonce: BigNumber) {
    const { safeSingletonABI, safeSingletonAddress, compatHandlerAddress, proxyFactoryAddress } = this.getGnosisAddresses(chainId);

    const owners = keys.map((key) => ethers.utils.computeAddress(addHexPrefix(key)));
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

    const safeSingletonIface = new utils.Interface(safeSingletonABI);

    const initializer = safeSingletonIface.encodeFunctionData('setup', methodParams);

    const proxyFactoryIface = new utils.Interface(proxyFactoryABI);

    const deployCode = await this.getDeployCode(provider, proxyFactoryABI, proxyFactoryAddress, safeSingletonAddress);
    const address = this.getSafeAddress(proxyFactoryAddress, initializer, deployCode, saltNonce);

    const input = proxyFactoryIface.encodeFunctionData('createProxyWithNonce', [safeSingletonAddress, initializer, saltNonce]);
    return { address, proxyFactoryAddress, input };
  }

  async getSafeTxHashAndTransactionData(
    provider: ethers.providers.BaseProvider,
    chainId: number,
    verifyingContract: string,
    safeTx: SafeTransaction,
    sender?: string,
  ) {
    const domain = { verifyingContract, chainId };
    const populated = await populatedResolvedNames(domain, safeTx, provider);
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
    provider: ethers.providers.BaseProvider,
    chainId: number,
    safeTx: SafeTransaction,
    verifyingContract: string,
    participants: string[] = [],
    sender?: string,
  ) {
    const { safeHash, input } = await this.getSafeTxHashAndTransactionData(provider, chainId!, verifyingContract, safeTx, sender);
    const signatures = participants.map((pubKey) => {
      return { pubKey, hash: stripHexPrefix(safeHash) };
    });
    return {
      serialized: stripHexPrefix(input),
      signatures,
      nonce: BigNumber.from(safeTx.nonce).toNumber(),
    };
  }

  async getSafeTxHash(provider: ethers.providers.BaseProvider, chainId: number, contract: string, safeTx: SafeTransaction) {
    const domain = { verifyingContract: contract, chainId };
    const populated = await populatedResolvedNames(domain, safeTx, provider);
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
