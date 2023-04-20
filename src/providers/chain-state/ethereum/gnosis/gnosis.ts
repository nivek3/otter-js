import {
  getSafeL2SingletonDeployment,
  getProxyFactoryDeployment,
  getCompatibilityFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
} from '@gnosis.pm/safe-deployments';
import { TypedDataDomain } from '@ethersproject/abstract-signer';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { BigNumberish, utils, ethers } from 'ethers';
import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';
export interface SafeSignature {
  signer: string;
  data: string;
}

export interface MetaTransaction {
  to: string;
  value: string | number;
  data: string;
  operation: number;
}

export interface SafeTransaction extends MetaTransaction {
  safeTxGas: string | number;
  baseGas: string | number;
  gasPrice: string | number;
  gasToken: string;
  refundReceiver: string;
  nonce: string | number;
}

export interface Template {
  to: string;
  value?: number | string;
  data?: string;
  operation?: number;
  safeTxGas?: number | string;
  baseGas?: number | string;
  gasPrice?: number | string;
  gasToken?: string;
  refundReceiver?: string;
  nonce: number;
}

export interface MetaTransaction {
  to: string;
  value: string | number;
  data: string;
  operation: number;
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const EIP712_SAFE_TX_TYPE = {
  SafeTx: [
    { type: 'address', name: 'to' },
    { type: 'uint256', name: 'value' },
    { type: 'bytes', name: 'data' },
    { type: 'uint8', name: 'operation' },
    { type: 'uint256', name: 'safeTxGas' },
    { type: 'uint256', name: 'baseGas' },
    { type: 'uint256', name: 'gasPrice' },
    { type: 'address', name: 'gasToken' },
    { type: 'address', name: 'refundReceiver' },
    { type: 'uint256', name: 'nonce' },
  ],
};

export function buildSafeTransaction(template: Template): SafeTransaction {
  return {
    to: template.to,
    value: template.value || 0,
    data: template.data || '0x',
    operation: template.operation || 0,
    safeTxGas: template.safeTxGas || 0,
    baseGas: template.baseGas || 0,
    gasPrice: template.gasPrice || 0,
    gasToken: template.gasToken || ZERO_ADDRESS,
    refundReceiver: template.refundReceiver || ZERO_ADDRESS,
    nonce: template.nonce,
  };
}

export function overrideSafeTransaction(safeTx: SafeTransaction, overrides: Partial<SafeTransaction>): SafeTransaction {
  return {
    ...safeTx,
    ...overrides,
  };
}

export function encodeMetaTransaction(tx: MetaTransaction): string {
  const data = utils.arrayify(tx.data);
  const encoded = utils.solidityPack(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [tx.operation, tx.to, tx.value, data.length, data],
  );
  return encoded.slice(2);
}

export function encodeMultiSend(txs: MetaTransaction[]): string {
  return '0x' + txs.map((tx) => encodeMetaTransaction(tx)).join('');
}

export function calculateSafeTransactionHash(chainId: BigNumberish, verifyingContract: string, safeTx: SafeTransaction) {
  return _TypedDataEncoder.hash({ verifyingContract, chainId }, EIP712_SAFE_TX_TYPE, safeTx);
}

export function buildSignatureBytes(signatures: SafeSignature[]) {
  signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()));
  let signatureBytes = '0x';
  for (const sig of signatures) {
    signatureBytes += stripHexPrefix(sig.data);
  }
  return signatureBytes;
}

export async function populatedResolvedNames(domain: TypedDataDomain, safeTx: SafeTransaction, provider?: ethers.providers.BaseProvider) {
  const populated = await _TypedDataEncoder.resolveNames(domain, EIP712_SAFE_TX_TYPE, safeTx, async (name): Promise<string> => {
    const address = await provider?.resolveName(name);
    return address || name;
  });
  return populated;
}

export function safeApproveHash(signerAddress: string) {
  return {
    signer: signerAddress,
    data:
      '0x000000000000000000000000' +
      stripHexPrefix(signerAddress) +
      '0000000000000000000000000000000000000000000000000000000000000000' +
      '01',
  };
}

export function decodeSafeApproveHashAddress(approve: string) {
  return addHexPrefix(addHexPrefix(approve).substring(26, 66));
}

export const version = '1.3.0';
export const released = true;
export const filter = { version, released };
export const safeSingleton = getSafeL2SingletonDeployment(filter);
export const safeSingletonABI = safeSingleton?.abi!;

export const compatHandler = getCompatibilityFallbackHandlerDeployment(filter);

export const proxyFactory = getProxyFactoryDeployment(filter);
export const proxyFactoryABI = proxyFactory?.abi!;

export const multiSendCall = getMultiSendCallOnlyDeployment(filter);
export const multiSendCallABI = multiSendCall?.abi!;
