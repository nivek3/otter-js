import { ApiPromise } from '@polkadot/api';

import { SignPlaceholder } from '../const';

export interface SignParams {
  api: ApiPromise;
  serialized: string;
  signature: string;
}

export function sign({ api, serialized, signature }: SignParams) {
  if (!serialized.startsWith('0x')) {
    serialized = '0x' + serialized;
  }
  if (signature.startsWith('0x')) {
    signature = signature.slice(2);
  }
  const placeholder = SignPlaceholder.slice(2);
  const hex = serialized.replace(placeholder, signature);
  return api.createType('Extrinsic', hex).toHex();
}
