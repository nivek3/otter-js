import { addHexPrefix } from 'ethereumjs-util';
import { ApiPromise } from '@polkadot/api';

interface Input {
  api: ApiPromise;
  serialized: string;
}

export const decode = function ({ api, serialized }: Input) {
  const extrinsic = api.createType('Extrinsic', addHexPrefix(serialized));
  const nonce = extrinsic.nonce.toNumber();
  let period: number | undefined;
  if (extrinsic.era?.isMortalEra) {
    period = extrinsic.era.asMortalEra?.period.toNumber();
  }
  return {
    nonce,
    period,
  };
};
