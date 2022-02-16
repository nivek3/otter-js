import { stripHexPrefix } from 'ethjs-util';
import { TypedDataDomain } from '@ethersproject/abstract-signer';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { BigNumberish } from 'ethers';
import Web3 from 'web3';
import { addHexPrefix } from 'ethereumjs-util';
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

export function buildSafeTransaction(template: Template) {
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

export async function populatedResolvedNames(domain: TypedDataDomain, safeTx: SafeTransaction, web3?: Web3) {
  const populated = await _TypedDataEncoder.resolveNames(domain, EIP712_SAFE_TX_TYPE, safeTx, async (name): Promise<string> => {
    const address = await web3?.eth.ens.getAddress(name);
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
