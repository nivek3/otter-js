import LRU from 'lru-cache';
import { LRUCache } from '../../../cache/lru';
import { RippleAPI } from 'ripple-lib';

export class ApiCache extends LRUCache<RippleAPI> {
  constructor(options: LRU.Options<string, RippleAPI>) {
    super({
      ...options,
      dispose: async function (_key: string, api: RippleAPI) {
        api.disconnect().catch();
      },
      updateAgeOnGet: true,
    });
  }

  getKey(provider: string) {
    return provider;
  }
}
