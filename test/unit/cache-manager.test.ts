import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager, SourceCacheManager } from '~/server/utils/cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ maxSize: 10, maxAge: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should respect TTL', async () => {
    cache.set('key1', 'value1', 100); // 100ms TTL
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBeNull();
  });

  it('should handle LRU eviction', () => {
    // Fill cache to capacity
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // Add one more, should evict the oldest (key0)
    cache.set('key10', 'value10');
    expect(cache.get('key0')).toBeNull();
    expect(cache.get('key10')).toBe('value10');
  });

  it('should update LRU on get', () => {
    // Use a cache with max size of 3 to test LRU eviction
    const smallCache = new CacheManager({ maxSize: 3, maxAge: 1000 });

    smallCache.set('key1', 'value1');
    smallCache.set('key2', 'value2');
    smallCache.set('key3', 'value3');

    // Access key1, making it newest
    smallCache.get('key1');

    // Add new key, should evict key2 (oldest, not accessed)
    smallCache.set('key4', 'value4');

    expect(smallCache.get('key1')).toBe('value1'); // Should still exist (was accessed)
    expect(smallCache.get('key2')).toBeNull(); // Should be evicted (oldest)
    expect(smallCache.get('key3')).toBe('value3'); // Should still exist
    expect(smallCache.get('key4')).toBe('value4'); // Should exist
  });

  it('should delete keys', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should check if key exists and not expired', async () => {
    cache.set('key1', 'value1', 100);
    expect(cache.has('key1')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.has('key1')).toBe(false);
  });

  it('should update TTL', async () => {
    cache.set('key1', 'value1', 100);
    cache.updateTTL('key1', 500);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBe('value1');
  });

  it('should get remaining TTL', async () => {
    cache.set('key1', 'value1', 200);
    const remaining1 = cache.getRemainingTTL('key1');
    expect(remaining1).toBeGreaterThan(150);
    expect(remaining1).toBeLessThanOrEqual(200); // Allow exactly 200

    await new Promise(resolve => setTimeout(resolve, 100));
    const remaining2 = cache.getRemainingTTL('key1');
    expect(remaining2).toBeLessThan(150);
  });

  it('should return stats', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.get('key1'); // Hit

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(10);
    expect(stats.totalAccess).toBe(3);
  });

  it('should track hit rate', () => {
    cache.set('key1', 'value1');

    cache.getWithStats('key1'); // Hit
    cache.getWithStats('key1'); // Hit
    cache.getWithStats('nonexistent'); // Miss

    const stats = cache.getStats();
    expect(stats.hitRate).toBeCloseTo(66.67, 1);
  });

  it('should handle setMany', () => {
    cache.setMany([
      { key: 'key1', data: 'value1' },
      { key: 'key2', data: 'value2' },
    ]);

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
  });

  it('should get entry with metadata', () => {
    const timestamp = Date.now();
    cache.set('key1', 'value1', 1000);

    const entry = cache.getEntry('key1');
    expect(entry).not.toBeNull();
    expect(entry?.data).toBe('value1');
    expect(entry?.ttl).toBe(1000);
    expect(entry?.timestamp).toBeGreaterThanOrEqual(timestamp);
  });
});

describe('SourceCacheManager', () => {
  let sourceCache: SourceCacheManager;

  beforeEach(() => {
    sourceCache = new SourceCacheManager({ maxSize: 10, maxAge: 1000 });
  });

  afterEach(() => {
    sourceCache.clear();
  });

  it('should set and get source-specific cache', () => {
    sourceCache.set('weibo', { data: 'weibo-data' });
    expect(sourceCache.get('weibo')).toEqual({ data: 'weibo-data' });
  });

  it('should handle keys with prefixes', () => {
    sourceCache.set('weibo', { data: 'data1' }, 'key1');
    sourceCache.set('weibo', { data: 'data2' }, 'key2');

    expect(sourceCache.get('weibo', 'key1')).toEqual({ data: 'data1' });
    expect(sourceCache.get('weibo', 'key2')).toEqual({ data: 'data2' });
  });

  it('should check if source cache exists', () => {
    sourceCache.set('weibo', 'data');
    expect(sourceCache.has('weibo')).toBe(true);
    expect(sourceCache.has('baidu')).toBe(false);
  });

  it('should delete source cache', () => {
    sourceCache.set('weibo', 'data');
    sourceCache.delete('weibo');
    expect(sourceCache.get('weibo')).toBeNull();
  });

  it('should set source-specific TTL', () => {
    sourceCache.setSourceTTL('weibo', 5000);
    expect(sourceCache.getSourceTTL('weibo')).toBe(5000);
  });

  it('should use default TTL when not set', () => {
    const defaultTTL = sourceCache.getSourceTTL('unknown');
    expect(defaultTTL).toBeGreaterThan(0);
  });

  it('should get stats for specific source', () => {
    sourceCache.set('weibo', 'data1', 'key1');
    sourceCache.set('weibo', 'data2', 'key2');
    sourceCache.set('baidu', 'data3');

    const stats = sourceCache.getStats('weibo');
    expect(stats.entries).toBe(2);
  });

  it('should clear all source caches', () => {
    sourceCache.set('weibo', 'data1');
    sourceCache.set('baidu', 'data2');
    sourceCache.clear();
    expect(sourceCache.get('weibo')).toBeNull();
    expect(sourceCache.get('baidu')).toBeNull();
  });
});
