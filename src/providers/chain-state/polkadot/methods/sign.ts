import { addHexPrefix, stripHexPrefix } from '@ethereumjs/util';
import { u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { SIGN_PLACEHOLDER } from '../const';
import { stripObjectHexPrefix } from '../utils';

export interface SignParams {
  api: ApiPromise;
  serialized: string;
  signature: string;
}

export function sign({ api, serialized, signature }: SignParams) {
  serialized = addHexPrefix(serialized);
  signature = stripHexPrefix(signature);
  const placeholder = stripHexPrefix(SIGN_PLACEHOLDER);
  const hex = serialized.replace(placeholder, signature);
  const extrinsic = api.createType('Extrinsic', hex);
  const extrinsicHex = extrinsic.toHex();
  const txHash = u8aToHex(extrinsic.hash);

  return stripObjectHexPrefix({
    serialized: extrinsicHex,
    txHash,
  });
}
