import { sha256 } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';
import { EncodeObject, Registry } from '@cosmjs/proto-signing';
import { AminoTypes, SignerData, defaultRegistryTypes } from '@cosmjs/stargate';
import { StdFee, StdSignDoc, encodeSecp256k1Pubkey, serializeSignDoc, makeSignDoc } from '@cosmjs/amino';
import { encodePubkey, makeAuthInfoBytes } from '@cosmjs/proto-signing';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Int53 } from '@cosmjs/math';

export function sortObject(obj: object) {
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);

  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  sortedKeys.forEach((key) => {
    result[key] = sortObject(obj[key]);
  });
  return result;
}

export function makeAminoSignDoc(
  messages: readonly EncodeObject[],
  fee: StdFee,
  memo: string | undefined,
  signerData: SignerData,
): StdSignDoc {
  const aminoTypes = new AminoTypes();
  const { accountNumber, sequence, chainId } = signerData;
  const msgs = messages.map((msg) => aminoTypes.toAmino(msg));
  return makeSignDoc(msgs, fee, chainId, memo, accountNumber, sequence);
}

export async function signAminoInstruction(
  keys: string[],
  messages: readonly EncodeObject[],
  fee: StdFee,
  memo: string | undefined,
  signerData: SignerData,
): Promise<{ tx: Uint8Array; message: Uint8Array }> {
  const aminoTypes = new AminoTypes();
  const registry = new Registry(defaultRegistryTypes);
  const { sequence } = signerData;
  const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;

  const signDoc = makeAminoSignDoc(messages, fee, memo, signerData);
  const signMessage = sha256(serializeSignDoc(signDoc));

  const signedTxBody = {
    messages: signDoc.msgs.map((msg) => aminoTypes.fromAmino(msg)),
    memo,
  };

  const signedTxBodyEncodeObject = {
    typeUrl: '/cosmos.tx.v1beta1.TxBody',
    value: signedTxBody,
  };

  const txBodyBytes = registry.encode(signedTxBodyEncodeObject);

  const gasLimit = Int53.fromString(fee.gas).toNumber();
  const pubKeys = keys.map((key) => {
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(key)));
    return {
      pubkey,
      sequence,
    };
  });
  const authInfoBytes = makeAuthInfoBytes(pubKeys, fee.amount, gasLimit, signMode);
  const txRaw = TxRaw.fromPartial({
    bodyBytes: txBodyBytes,
    authInfoBytes,
  });
  return {
    tx: TxRaw.encode(txRaw).finish(),
    message: signMessage,
  };
}
