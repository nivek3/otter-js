import assert from 'assert';
import { pick } from 'lodash';
import { ethers } from 'ethers';
import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';

export const TX_FIELDS = 'accessList chainId data gasPrice gasLimit maxFeePerGas maxPriorityFeePerGas nonce to type value'.split(' ');
export const SIG_FIELDS = 'r s v'.split(' ');

export const isEip1559 = (type?: number | string | null) => {
  return type && ethers.BigNumber.from(type).toNumber() === 2;
};

export const decodeRawTransaction = (raw: string) => {
  const decoded = ethers.utils.parseTransaction(addHexPrefix(raw));
  const unsignedTransaction = pick(decoded, TX_FIELDS) as ethers.UnsignedTransaction;
  const signature = pick(decoded, SIG_FIELDS) as ethers.Signature;
  const unsignedSerialized = ethers.utils.serializeTransaction(unsignedTransaction);
  const signatureHash = ethers.utils.keccak256(unsignedSerialized);
  const signed = signature.r && !ethers.BigNumber.from(signature.r).isZero() && signature.s && !ethers.BigNumber.from(signature.s).isZero();
  let recoveredPublicKey: string | undefined = undefined;
  if (signed) {
    recoveredPublicKey = ethers.utils.recoverPublicKey(signatureHash, signature);
    recoveredPublicKey = ethers.utils.computePublicKey(recoveredPublicKey, true);
    const recoveredAddress = ethers.utils.computeAddress(recoveredPublicKey);
    assert.strictEqual(recoveredAddress, decoded.from, 'Recovered address does not match from address');
    recoveredPublicKey = stripHexPrefix(recoveredPublicKey);
  }

  return {
    unsignedSerialized,
    signatureHash,
    signature,
    unsignedTransaction,
    recoveredPublicKey,
  };
};
