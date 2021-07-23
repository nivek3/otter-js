import { addHexPrefix } from 'ethereumjs-util';
import { ApiPromise } from '@polkadot/api';

export interface DecodeParams {
  api: ApiPromise;
  serialized: string;
}

export const decode = function ({ api, serialized }: DecodeParams) {
  const extrinsic = api.createType('Extrinsic', addHexPrefix(serialized));
  const nonce = extrinsic.nonce.toNumber();

  return {
    nonce,
  };
};
