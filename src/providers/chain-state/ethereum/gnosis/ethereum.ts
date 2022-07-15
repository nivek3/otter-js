import Web3 from 'web3';
import { utils, BigNumber } from 'ethers';
import { toBN } from 'web3-utils';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { splitSignature, joinSignature } from '@ethersproject/bytes';
import { TransactionFactory, TxData, AccessListEIP2930TxData, FeeMarketEIP1559TxData } from '@ethereumjs/tx';

import { stripHexPrefix, addHexPrefix } from 'ethereumjs-util';
import {
  getSafeSingletonDeployment,
  getProxyFactoryDeployment,
  getCompatibilityFallbackHandlerDeployment,
} from '@gnosis.pm/safe-deployments';
import { Validator } from '@src/utils/ajv';
import { errors, AppError } from '@src/error';

import { TransactionReply, Signature } from '@src/__proto__/common/types';
import {
  GetAccountAddressRequest,
  GetAccountAddressReply,
  BuildAccountTransactionRequest,
  BuildAccountTransactionReply,
  BuildMultisigTransferInputRequest,
  SignMultisigTransferInputRequest,
  BuildMultisigTransactionRequest,
  BuildMultisigERC20TransferInputRequest,
  SignMultisigERC20TransferInputRequest,
  BuildMultisigInputRequest,
} from '@src/__proto__/ethereum/gnosis/types';
import { pubToBIP55Address } from '../common/utils';
import { BaseProvider } from '../common/base';
import { canonicalSignature } from '@src/utils/signature';
import {
  ZERO_ADDRESS,
  buildSafeTransaction,
  buildSignatureBytes,
  calculateSafeTransactionHash,
  populatedResolvedNames,
  safeApproveHash,
  decodeSafeApproveHashAddress,
  SafeTransaction,
} from './gnosis';
import {
  EthereumRefSchema,
  GetAccountRequestSchema,
  BuildMultisigInputRequestSchema,
  BuildAccountTransactionRequestSchema,
  SignMultisigTransferInputRequestSchema,
  BuildMultisigTransferInputRequestSchema,
  BuildMultisigERC20TransferInputRequestSchema,
  SignMultisigERC20TransferInputRequestSchema,
  BuildMultisigTransferTransactionRequestSchema,
} from './ethereum.schema';

type FactoryTxData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData;

const Contract = require('web3-eth-contract');

const version = '1.3.0';
const released = true;
const filter = { version, released };
const safeSingleton = getSafeSingletonDeployment(filter);
const safeSingletonABI = safeSingleton!.abi;

const compatHandler = getCompatibilityFallbackHandlerDeployment(filter);
const validator = new Validator({ schemas: [EthereumRefSchema], allowUnionTypes: true });

const proxyFactory = getProxyFactoryDeployment(filter);
const proxyFactoryABI = proxyFactory?.abi;

export class Provider extends BaseProvider {
  async getAccountAddress(req: GetAccountAddressRequest): Promise<GetAccountAddressReply> {
    validator.assert(GetAccountRequestSchema, req);

    const { network, threshold, keys, saltNonce } = req as Required<GetAccountAddressRequest>;
    const { provider, chainId } = network!;
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const web3 = new Web3(provider!);
    const { address } = await this.getGnosisTxData(web3, chainId, keys, threshold, BigNumber.from(saltNonce!));

    return {
      address,
      saltNonce,
    };
  }

  async buildAccountTransaction(req: BuildAccountTransactionRequest): Promise<BuildAccountTransactionReply> {
    validator.assert(BuildAccountTransactionRequestSchema, req);

    const { threshold, keys, sender, network, params } = req as Required<BuildAccountTransactionRequest>;
    const { provider, chainId } = network!;
    if (!chainId) throw new AppError(errors.INVALID_ARGUMENT, { details: 'chainId is required' });
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const saltNonce = this.getReqSaltNonce(req.saltNonce?.toString());

    const { address, input, proxyFactoryAddress } = await this.getGnosisTxData(web3, chainId, keys, threshold, saltNonce);

    const txInput = {
      data: input,
      to: proxyFactoryAddress,
    };

    const txData = await this.getTxData(txInput, common, params!, web3, sender);

    const tx = TransactionFactory.fromTxData(txData, txOptions);
    const hash = tx.getMessageToSign(true).toString('hex');

    const signature = { hash };
    const estimatedFee = this.getTxEstimatedFee(tx);

    return {
      serialized: tx.serialize().toString('hex'),
      signatures: [signature],
      address,
      estimatedFee,
    };
  }

  async buildMultisigInput(req: BuildMultisigInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigInputRequestSchema, req);

    const { network, quantity, to, data, contract, participants, sender } = req as Required<BuildMultisigInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const multiSigContractNonce = await this.getMultisigContractNonce(contract, web3, req?.contractNonce);
    const safeTx = buildSafeTransaction({
      to,
      value: quantity,
      nonce: multiSigContractNonce,
      data,
    });

    const { safeHash, input } = await this.getTxSafeHashAndInput(web3, chainId!, to, quantity, data, contract, safeTx, sender);
    const signatures = participants.map((pubKey) => {
      return {
        pubKey,
        hash: stripHexPrefix(safeHash),
      };
    });

    return {
      serialized: stripHexPrefix(input),
      signatures,
    };
  }

  async buildMultisigTransferInput(req: BuildMultisigTransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferInputRequestSchema, req);

    const { network, toAddress, quantity, contract, participants, sender } = req as Required<BuildMultisigTransferInputRequest>;
    const { chainId } = network!;
    const web3 = new Web3(network?.provider!);
    const multiSigContractNonce = await this.getMultisigContractNonce(contract, web3, req?.contractNonce);

    const safeTx = buildSafeTransaction({
      to: toAddress,
      value: quantity,
      nonce: multiSigContractNonce,
    });

    const { safeHash, input } = await this.getTxSafeHashAndInput(web3, chainId!, toAddress, quantity, '0x', contract, safeTx, sender);
    const signatures = participants.map((pubKey) => {
      return {
        pubKey,
        hash: stripHexPrefix(safeHash),
      };
    });

    return {
      serialized: stripHexPrefix(input),
      signatures,
    };
  }

  signMultisigTransferInput(req: SignMultisigTransferInputRequest): TransactionReply {
    validator.assert(SignMultisigTransferInputRequestSchema, req);

    const input = this.getReqInput(req);

    return {
      serialized: stripHexPrefix(input),
    };
  }

  async buildMultisigTransaction(req: BuildMultisigTransactionRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigTransferTransactionRequestSchema, req);

    const { network, contract, sender, params, value } = req as Required<BuildMultisigTransactionRequest>;
    const { provider } = network!;
    const common = this.getTxCommon(network!);
    const txOptions = { common };
    const web3 = new Web3(provider!);
    const data = addHexPrefix(stripHexPrefix(this.getReqInput(req)));

    const txInput: FactoryTxData = {
      to: contract,
      data,
      value,
    };

    const txData = await this.getTxData(txInput, common, params!, web3, sender);

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

  async buildMultisigERC20TransferInput(req: BuildMultisigERC20TransferInputRequest): Promise<TransactionReply> {
    validator.assert(BuildMultisigERC20TransferInputRequestSchema, req);

    const { toAddress, quantity, tokenAddress, contract, participants, sender } = req as Required<BuildMultisigERC20TransferInputRequest>;
    const { chainId, provider } = req.network!;
    const web3 = new Web3(provider!);

    const data = this.getERC20TransferInput(toAddress, quantity);

    const multiSigContractNonce = await this.getMultisigContractNonce(contract, web3, req?.contractNonce);

    const safeTx = buildSafeTransaction({
      to: tokenAddress,
      data,
      nonce: multiSigContractNonce,
    });

    const { safeHash, input } = await this.getTxSafeHashAndInput(web3, chainId!, tokenAddress, '', data, contract, safeTx, sender);
    const signatures = participants.map((pubKey) => {
      return {
        pubKey,
        hash: stripHexPrefix(safeHash),
      };
    });

    return {
      serialized: stripHexPrefix(input),
      signatures,
    };
  }

  async signMultisigERC20TransferInput(req: SignMultisigERC20TransferInputRequest): Promise<TransactionReply> {
    validator.assert(SignMultisigERC20TransferInputRequestSchema, req);

    const input = this.getReqInput(req);

    return {
      serialized: stripHexPrefix(input),
    };
  }

  getGnosisAddresses(chainId: number) {
    const safeSingletonABI = safeSingleton?.abi;
    const safeSingletonAddress = safeSingleton?.networkAddresses[chainId];
    const compatHandlerAddress = compatHandler?.networkAddresses[chainId];
    const proxyFactoryAddress = proxyFactory?.networkAddresses[chainId];

    if (!safeSingletonABI || !safeSingletonAddress || !compatHandlerAddress || !proxyFactoryAddress)
      throw new AppError(errors.INVALID_ARGUMENT, { details: 'invalid chainId' });

    return { safeSingletonABI, safeSingletonAddress, compatHandlerAddress, proxyFactoryAddress };
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

  async getMultisigContractNonce(multiSigAddress: string, web3: Web3, multiSigContractNonce?: number) {
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

  getReqInput(req: Pick<BuildMultisigTransactionRequest, 'serialized' | 'signatures' | 'data'>): string {
    const { serialized, signatures, data } = req;
    if (data) return data;

    return this.signSendMultiSigInput(serialized!, signatures!);
  }

  signSendMultiSigInput(serialized: string, signatures: Signature[]) {
    const participants = signatures.map((sig) => {
      const { signature, pubKey } = sig;
      const { r, s, v } = canonicalSignature(signature!);
      return {
        signer: pubToBIP55Address(pubKey!),
        data: joinSignature(splitSignature({ r: addHexPrefix(r), s: addHexPrefix(s), recoveryParam: v })),
      };
    });

    const iface = new utils.Interface(safeSingletonABI);
    const [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, approve] = iface.decodeFunctionData(
      'execTransaction',
      addHexPrefix(serialized),
    );

    const sender = decodeSafeApproveHashAddress(approve);
    const signatureBytes = buildSignatureBytes([...participants, safeApproveHash(sender)]);

    const inputs = [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signatureBytes];
    const safeSingletonContract = new Contract(safeSingletonABI);
    return safeSingletonContract.methods.execTransaction(...inputs).encodeABI();
  }

  async getGnosisTxData(web3: Web3, chainId: number, keys: string[], threshold: number, saltNonce: BigNumber) {
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

  async getTxSafeHashAndInput(
    web3: Web3,
    chainId: number,
    toAddress: string,
    value: string,
    data: string,
    contract: string,
    safeTx: SafeTransaction,
    sender: string,
  ) {
    const domain = { verifyingContract: contract, chainId };
    const populated = await populatedResolvedNames(domain, safeTx, web3);
    const safeHash = calculateSafeTransactionHash(populated.domain.chainId!, populated.domain.verifyingContract!, safeTx);
    const approve = safeApproveHash(sender);
    const params = [
      toAddress,
      value || 0,
      data || '0x',
      0, // operation
      0, // safeTxGas
      0, // dataGas
      0, // gasPrice
      ZERO_ADDRESS, // gasToken
      ZERO_ADDRESS, // refundReceiver
      approve.data,
    ];
    const safeSingletonContract = new Contract(safeSingletonABI);
    const input = safeSingletonContract.methods.execTransaction(...params).encodeABI();
    return { input, safeHash };
  }
}

export const provider = new Provider();
