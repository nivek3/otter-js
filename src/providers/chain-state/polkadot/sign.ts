import { ApiPromise } from '@polkadot/api';

import { SIGN_PLACEHOLDER } from './const';
import { preparePrefix, trimPrefix } from './utils';

export interface SignParams {
  api: ApiPromise;
  serialized: string;
  signature: string;
}

export function sign({ api, serialized, signature }: SignParams) {
  const prefix = '0x';
  serialized = preparePrefix(serialized, prefix);
  signature = trimPrefix(signature, prefix);
  const placeholder = trimPrefix(SIGN_PLACEHOLDER);
  const hex = serialized.replace(placeholder, signature);
  return api.createType('Extrinsic', hex).toHex();
}
