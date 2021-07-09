import { LRUCache } from './lru';
import { ApiPromise } from '@polkadot/api';
const separator = '-';

export class ApiCache extends LRUCache<ApiPromise> {
  constructor({ max = 500 }) {
    const options = { max };
    super(options);
  }

  getKey(provider: string, ss58Format: number) {
    return provider + separator + ss58Format;
  }
}
