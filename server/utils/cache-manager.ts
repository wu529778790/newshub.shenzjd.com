import { logger } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live (毫秒)
}

/**
 * LRU 缓存策略接口
 */
interface LRUOptions {
  maxSize: number; // 最大缓存条目数
  maxAge: number;  // 默认过期时间（毫秒）
}

/**
 * 智能缓存管理器
 * 支持 LRU、TTL、持久化
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private lruOrder = new Map<string, number>(); // 记录访问顺序
  private accessCounter = 0;
  private options: Required<LRUOptions>;
  private persistPath: string;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(options: Partial<LRUOptions> = {}, persistPath?: string) {
    this.options = {
      maxSize: options.maxSize || 100,
      maxAge: options.maxAge || 10 * 60 * 1000, // 默认 10 分钟
    };
    this.persistPath = persistPath || './data/cache.json';
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // 更新 LRU 顺序
    this.accessCounter++;
    this.lruOrder.set(key, this.accessCounter);

    return entry.data;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.maxAge,
    };

    // 如果已存在，先删除（更新 LRU）
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.lruOrder.delete(key);
    }

    // 检查容量，使用 LRU 淘汰
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessCounter++;
    this.lruOrder.set(key, this.accessCounter);

    // 自动持久化（节流）
    this.schedulePersist();
  }

  /**
   * 批量设置
   */
  setMany<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const item of items) {
      this.set(item.key, item.data, item.ttl);
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    this.lruOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.lruOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    evictions: number;
    totalAccess: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: this.calculateHitRate(),
      evictions: this.evictionCount,
      totalAccess: this.accessCounter,
    };
  }

  private evictionCount = 0;
  private hitCount = 0;
  private missCount = 0;

  /**
   * LRU 淘汰策略
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    // 找到最久未使用的
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, order] of this.lruOrder.entries()) {
      if (order < oldestTime) {
        oldestTime = order;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.evictionCount++;
      logger.debug(`LRU 淘汰: ${oldestKey}`);
    }
  }

  /**
   * 计算命中率
   */
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  /**
   * 获取带统计的缓存
   */
  getWithStats<T>(key: string): { data: T | null; hit: boolean } {
    const data = this.get<T>(key);
    if (data !== null) {
      this.hitCount++;
      return { data, hit: true };
    } else {
      this.missCount++;
      return { data: null, hit: false };
    }
  }

  /**
   * 持久化到文件
   */
  async persist(): Promise<void> {
    try {
      // 确保目录存在
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });

      // 只持久化未过期的数据
      const now = Date.now();
      const validEntries: Record<string, CacheEntry<any>> = {};

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp <= entry.ttl) {
          validEntries[key] = entry;
        }
      }

      const data = {
        version: '1.0',
        timestamp: now,
        entries: validEntries,
        stats: this.getStats(),
      };

      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
      logger.info(`缓存已持久化: ${Object.keys(validEntries).length} 条目`);
    } catch (error) {
      logger.error('缓存持久化失败:', error);
    }
  }

  /**
   * 从文件恢复
   */
  async restore(): Promise<void> {
    try {
      const content = await fs.readFile(this.persistPath, 'utf-8');
      const data = JSON.parse(content);

      const now = Date.now();
      let restored = 0;
      let expired = 0;

      for (const [key, entry] of Object.entries(data.entries)) {
        const cacheEntry = entry as CacheEntry<any>;

        // 检查是否过期
        if (now - cacheEntry.timestamp <= cacheEntry.ttl) {
          this.cache.set(key, cacheEntry);
          this.lruOrder.set(key, ++this.accessCounter);
          restored++;
        } else {
          expired++;
        }
      }

      logger.info(`缓存恢复: ${restored} 条目, ${expired} 已过期`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('缓存文件不存在，跳过恢复');
      } else {
        logger.error('缓存恢复失败:', error);
      }
    }
  }

  /**
   * 调度持久化（节流，避免频繁 IO）
   */
  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    // 延迟 5 秒执行
    this.persistTimer = setTimeout(() => {
      this.persist();
      this.persistTimer = null;
    }, 5000);
  }

  /**
   * 设置自动持久化间隔
   */
  startAutoPersist(intervalMs: number = 60000): void {
    setInterval(() => {
      this.persist();
    }, intervalMs);
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存条目（包含元数据）
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * 更新 TTL
   */
  updateTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = ttl;
    entry.timestamp = Date.now(); // 重置时间戳
    return true;
  }

  /**
   * 获取剩余过期时间
   */
  getRemainingTTL(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const elapsed = Date.now() - entry.timestamp;
    const remaining = entry.ttl - elapsed;

    return remaining > 0 ? remaining : 0;
  }
}

/**
 * 数据源特定的缓存管理器
 */
export class SourceCacheManager {
  private cache: CacheManager;
  private sourceTTL: Record<string, number> = {};

  constructor(options?: Partial<LRUOptions>, persistPath?: string) {
    this.cache = new CacheManager(options, persistPath);
  }

  /**
   * 设置数据源的 TTL
   */
  setSourceTTL(sourceId: string, ttl: number): void {
    this.sourceTTL[sourceId] = ttl;
  }

  /**
   * 获取数据源的默认 TTL
   */
  getSourceTTL(sourceId: string): number {
    return this.sourceTTL[sourceId] || this.cache['options'].maxAge;
  }

  /**
   * 获取数据源缓存
   */
  get<T>(sourceId: string, key?: string): T | null {
    const cacheKey = key ? `${sourceId}:${key}` : sourceId;
    return this.cache.get<T>(cacheKey);
  }

  /**
   * 设置数据源缓存
   */
  set<T>(sourceId: string, data: T, key?: string, ttl?: number): void {
    const cacheKey = key ? `${sourceId}:${key}` : sourceId;
    const finalTTL = ttl || this.getSourceTTL(sourceId);
    this.cache.set(cacheKey, data, finalTTL);
  }

  /**
   * 检查数据源缓存
   */
  has(sourceId: string, key?: string): boolean {
    const cacheKey = key ? `${sourceId}:${key}` : sourceId;
    return this.cache.has(cacheKey);
  }

  /**
   * 删除数据源缓存
   */
  delete(sourceId: string, key?: string): void {
    const cacheKey = key ? `${sourceId}:${key}` : sourceId;
    this.cache.delete(cacheKey);
  }

  /**
   * 清空所有数据源缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取数据源统计
   */
  getStats(sourceId?: string): any {
    if (sourceId) {
      const keys = this.cache.keys().filter(k => k.startsWith(`${sourceId}:`) || k === sourceId);
      return {
        sourceId,
        entries: keys.length,
        totalSize: this.cache.getStats().size,
      };
    }
    return this.cache.getStats();
  }
}

/**
 * 内存缓存单例
 */
export const memoryCache = new CacheManager({
  maxSize: 200,
  maxAge: 10 * 60 * 1000, // 10 分钟
});

/**
 * 数据源缓存单例
 */
export const sourceCache = new SourceCacheManager(
  {
    maxSize: 100,
    maxAge: 10 * 60 * 1000,
  },
  './data/source-cache.json'
);

/**
 * 缓存装饰器
 */
export function Cacheable(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const key = `${propertyKey}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = memoryCache.get(key);
      if (cached !== null) {
        logger.debug(`缓存命中: ${key}`);
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      memoryCache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存包装函数
 */
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  options: {
    ttl?: number;
    force?: boolean;
    cacheManager?: CacheManager;
  } = {}
): Promise<T> {
  const { ttl, force = false, cacheManager = memoryCache } = options;

  if (!force) {
    const cached = cacheManager.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  const result = await operation();
  cacheManager.set(key, result, ttl);

  return result;
}

/**
 * 缓存预热
 */
export async function warmupCache(
  sources: Array<{ id: string; fetcher: () => Promise<any> }>,
  options: { concurrency?: number; ttl?: number } = {}
): Promise<void> {
  const { concurrency = 3, ttl } = options;

  logger.info(`开始缓存预热，共 ${sources.length} 个数据源...`);

  const queue = new (await import('./concurrency')).TaskQueue(concurrency);

  const promises = sources.map(source =>
    queue.add(async () => {
      try {
        const data = await source.fetcher();
        sourceCache.set(source.id, data, undefined, ttl);
        logger.info(`✓ 预热完成: ${source.id}`);
      } catch (error) {
        logger.error(`预热失败: ${source.id}`, error);
      }
    })
  );

  await Promise.all(promises);
  logger.info('缓存预热完成');
}
