import { addHexPrefix, stripHexPrefix } from 'ethereumjs-util';
import { ApiPromise } from '@polkadot/api';

import { SIGN_PLACEHOLDER } from '../const';

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
  return api.createType('Extrinsic', hex).toHex();
}
