import BN from 'bn.js';
import { toHex } from 'web3-utils';
import { ec as EC } from 'elliptic';
import { stripHexPrefix } from 'ethjs-util';
const ec = new EC('secp256k1');

export const splitSignature = (signature: string) => {
  const length = signature.length;
  const unitLen = length >> 2;
  const r = signature.slice(0, unitLen << 1);
  const s = signature.slice(unitLen << 1, unitLen << 2);
  const v = unitLen << 2 < length ? Number.parseInt(signature.slice(unitLen << 2), 16) : undefined;
  return { r, s, v };
};

export const canonicalSignature = (signature: string) => {
  const parsed = splitSignature(signature);
  let r = new BN(Buffer.from(parsed.r!, 'hex'));
  let s = new BN(Buffer.from(parsed.s!, 'hex'));
  let recoveryParam = parsed.v!;
  if (s.cmp(ec.nh) > 0) {
    s = ec.n!.sub(s);
    recoveryParam ^= 1;
  }
  return {
    r: stripHexPrefix(toHex(r)),
    s: stripHexPrefix(toHex(s)),
    v: recoveryParam,
  };
};
