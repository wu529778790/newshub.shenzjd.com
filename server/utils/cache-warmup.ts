import { getCacheTable } from '~/server/database/cache';
import { getHotList } from '~/server/services/source-manager';
import { sourceRegistry } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';

/**
 * 缓存预热工具
 * 在服务启动时预热热门数据源，避免首次访问延迟
 */

// 高优先级预热源（用户最常访问）
const WARMUP_SOURCES = ['weibo', 'baidu', 'zhihu', 'bilibili'];

// 预热配置
const WARMUP_CONFIG = {
  // 并发数限制
  concurrency: 2,
  // 批次间隔（ms）
  batchDelay: 500,
  // 超时时间（ms）
  timeout: 15000,
};

/**
 * 预热单个数据源
 */
async function warmupSingleSource(sourceId: string): Promise<boolean> {
  try {
    const startTime = Date.now();

    // 检查数据源是否启用
    const config = sourceRegistry.get(sourceId);
    if (!config || !config.enabled || config.disable === true) {
      logger.warn(`预热跳过: ${sourceId} (未启用)`);
      return false;
    }

    // 检查缓存是否已存在且有效
    const cacheTable = await getCacheTable();
    const existingCache = await cacheTable.get(sourceId);

    if (existingCache && (Date.now() - existingCache.updated) < 60000) {
      logger.info(`预热跳过: ${sourceId} (缓存有效)`);
      return true;
    }

    // 抓取数据
    logger.info(`开始预热: ${sourceId}`);
    const items = await Promise.race([
      getHotList(sourceId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('预热超时')), WARMUP_CONFIG.timeout)
      )
    ]) as any[];

    // 保存到缓存
    await cacheTable.set(sourceId, items);

    const duration = Date.now() - startTime;
    logger.success(`预热完成: ${sourceId} (${items.length}条, ${duration}ms)`);

    return true;
  } catch (error) {
    logger.error(`预热失败: ${sourceId}`, error);
    return false;
  }
}

/**
 * 分批预热数据源
 */
async function warmupBatch(sourceIds: string[], concurrency: number): Promise<number> {
  let successCount = 0;

  for (let i = 0; i < sourceIds.length; i += concurrency) {
    const batch = sourceIds.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(id => warmupSingleSource(id))
    );

    // 统计成功数
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      }
    });

    // 批次间延迟（最后一个批次除外）
    if (i + concurrency < sourceIds.length) {
      await new Promise(resolve => setTimeout(resolve, WARMUP_CONFIG.batchDelay));
    }
  }

  return successCount;
}

/**
 * 执行缓存预热
 */
export async function warmupCache(options?: {
  sources?: string[];
  force?: boolean;
}): Promise<{
  total: number;
  success: number;
  duration: number;
}> {
  const startTime = Date.now();
  const sourceIds = options?.sources || WARMUP_SOURCES;

  logger.info(`🚀 开始缓存预热，目标: ${sourceIds.length} 个数据源`);

  // 过滤已启用的数据源
  const enabledSources = sourceIds.filter(id => {
    const config = sourceRegistry.get(id);
    return config && config.enabled && config.disable !== true;
  });

  if (enabledSources.length === 0) {
    logger.warn('没有可用的数据源进行预热');
    return { total: 0, success: 0, duration: 0 };
  }

  // 执行预热
  const successCount = await warmupBatch(enabledSources, WARMUP_CONFIG.concurrency);

  const duration = Date.now() - startTime;
  logger.success(`✅ 缓存预热完成: ${successCount}/${enabledSources.length} 成功，耗时 ${duration}ms`);

  return {
    total: enabledSources.length,
    success: successCount,
    duration,
  };
}

/**
 * 服务启动时自动预热
 * 在 server/api/hot-list.get.ts 或 nuxt.config.ts 中调用
 */
export async function autoWarmupOnStartup() {
  // 延迟执行，避免影响服务启动
  setTimeout(async () => {
    try {
      await warmupCache();
    } catch (error) {
      logger.error('自动预热失败', error);
    }
  }, 1000); // 延迟1秒后开始预热
}
