import LRU from 'lru-cache';
import { LRUCache } from '../../../cache/lru';
import { ApiPromise } from '@polkadot/api';
const separator = '-';

export class ApiCache extends LRUCache<ApiPromise> {
  constructor(options: LRU.Options<string, ApiPromise>) {
    super({
      ...options,
      dispose: async function (_key: string, api: ApiPromise) {
        api.disconnect().catch();
      },
      updateAgeOnGet: true,
    });
  }

  getKey(provider: string, ss58Format: number) {
    return provider + separator + ss58Format;
  }
}
