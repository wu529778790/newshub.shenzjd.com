import type { NewsItem, SourceID } from "@shared/types";
import type { CacheInfo } from "../types";
import fs from 'fs/promises';
import path from 'path';

const inMemoryCache = new Map<string, CacheInfo>();

// 缓存目录
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

export class Cache {
  private fileCacheEnabled = true;

  async init() {
    // 创建缓存目录
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      logger.success(`缓存目录已创建: ${CACHE_DIR}`);

      // 启动时从文件恢复缓存
      await this.restoreFromFile();
    } catch (err) {
      logger.warn('无法创建缓存目录，仅使用内存缓存');
      this.fileCacheEnabled = false;
    }
  }

  async set(key: string, value: NewsItem[]) {
    const now = Date.now();
    const cacheData: CacheInfo = { id: key as SourceID, items: value, updated: now };

    // 1. 内存缓存（立即可用）
    inMemoryCache.set(key, cacheData);
    logger.success(`set ${key} in-memory cache (${value.length} items)`);

    // 2. 异步文件缓存（不阻塞）
    if (this.fileCacheEnabled) {
      this.saveToFile(key, cacheData).catch(err => {
        logger.error(`文件缓存保存失败: ${key}`, err);
      });
    }
  }

  async get(key: string): Promise<CacheInfo | undefined> {
    // 优先从内存获取
    const cache = inMemoryCache.get(key);
    if (cache) {
      logger.success(`get ${key} in-memory cache`);
      return cache;
    }

    // 内存未命中，尝试从文件恢复
    if (this.fileCacheEnabled) {
      const fileCache = await this.loadFromFile(key);
      if (fileCache) {
        // 恢复到内存
        inMemoryCache.set(key, fileCache);
        logger.success(`restored ${key} from file cache`);
        return fileCache;
      }
    }
  }

  async getEntire(keys: string[]): Promise<CacheInfo[]> {
    const results: CacheInfo[] = [];
    for (const key of keys) {
      const cache = await this.get(key);
      if (cache) {
        results.push(cache);
      }
    }
    logger.success(`get entire (${results.length}/${keys.length}) cache`);
    return results;
  }

  async delete(key: string) {
    inMemoryCache.delete(key);

    if (this.fileCacheEnabled) {
      try {
        const filePath = path.join(CACHE_DIR, `${key}.json`);
        await fs.unlink(filePath);
      } catch (err) {
        // 文件可能不存在，忽略错误
      }
    }

    logger.success(`delete ${key} from cache`);
  }

  // 保存到文件（异步）
  private async saveToFile(key: string, data: CacheInfo) {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
  }

  // 从文件加载
  private async loadFromFile(key: string): Promise<CacheInfo | undefined> {
    try {
      const filePath = path.join(CACHE_DIR, `${key}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data: CacheInfo = JSON.parse(content);

      // 检查缓存是否过期（1小时）
      const age = Date.now() - data.updated;
      if (age > 3600000) {
        await fs.unlink(filePath).catch(() => {});
        return undefined;
      }

      return data;
    } catch (err) {
      return undefined;
    }
  }

  // 从文件恢复所有缓存
  private async restoreFromFile() {
    try {
      const files = await fs.readdir(CACHE_DIR);
      let restoredCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const cache = await this.loadFromFile(key);

          if (cache) {
            inMemoryCache.set(key, cache);
            restoredCount++;
          }
        }
      }

      if (restoredCount > 0) {
        logger.success(`从文件恢复 ${restoredCount} 个缓存`);
      } else {
        logger.info('无有效缓存可恢复');
      }
    } catch (err) {
      logger.warn('缓存恢复失败，可能是首次启动');
    }
  }
}

export async function getCacheTable() {
  try {
    const cacheTable = new Cache();
    await cacheTable.init();
    return cacheTable;
  } catch (e) {
    logger.error("failed to init cache ", e);
    // 降级到纯内存缓存
    const fallbackCache = new Cache();
    fallbackCache['fileCacheEnabled'] = false;
    return fallbackCache;
  }
}
