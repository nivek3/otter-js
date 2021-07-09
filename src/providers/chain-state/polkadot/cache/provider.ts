import { LRUCache } from './lru';
import { WsProvider } from '@polkadot/api';

export class ProviderCache extends LRUCache<WsProvider> {
  constructor({ max = 500 }) {
    const options = { max };
    super(options);
  }

  getKey(provider: string) {
    return provider;
  }
}
