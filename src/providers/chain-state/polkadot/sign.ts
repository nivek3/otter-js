import { ApiPromise } from '@polkadot/api';

import { SignPlaceholder } from './const';

export interface SignParams {
  api: ApiPromise;
  serialized: string;
  signature: string;
}

export function sign({ api, serialized, signature }: SignParams) {
  const prefix = '0x';
  if (!serialized.startsWith(prefix)) {
    serialized = prefix + serialized;
  }
  if (signature.startsWith(prefix)) {
    signature = signature.slice(2);
  }
  const placeholder = SignPlaceholder.slice(2);
  const hex = serialized.replace(placeholder, signature);
  return api.createType('Extrinsic', hex).toHex();
}
