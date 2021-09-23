import LRU from 'lru-cache';
export class LRUCache<T> {
  cache: LRU<string, T>;
  constructor(options: LRU.Options<string, T>) {
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
