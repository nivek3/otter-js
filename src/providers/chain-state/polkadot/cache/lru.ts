import LRU from 'lru-cache';
const separator = '-';

export class LRUCache<T> {
  cache: LRU<string, T>;
  constructor({ max = 500 }) {
    const options = { max };
    this.cache = new LRU<string, T>(options);
  }

  has(key: string) {
    return this.cache.has(key);
  }

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: T) {
    this.cache.set(key, value);
  }
}
