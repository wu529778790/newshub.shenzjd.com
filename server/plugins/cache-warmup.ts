import { sourceRegistry } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';
import { getCacheTable } from '~/server/database/cache';

/**
 * 缓存预热插件
 * 在服务器启动时自动预热热门数据源，避免首次请求慢的问题
 */

// 预热策略配置
const WARMUP_CONFIG = {
  // 预热的数据源列表（按优先级）
  prioritySources: ['weibo', 'zhihu', 'baidu', 'bilibili', 'douyin', 'github'],

  // 并发预热数量
  concurrency: 3,

  // 预热延迟（避免同时请求导致被限流）
  delayBetweenRequests: 200, // ms

  // 超时时间
  timeout: 30000,
};

/**
 * 延迟函数
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 预热单个数据源
 */
async function warmupSource(sourceId: string): Promise<boolean> {
  const config = sourceRegistry.get(sourceId);
  if (!config) {
    logger.warn(`预热失败: 数据源 ${sourceId} 不存在`);
    return false;
  }

  if (!config.enabled || config.disable) {
    logger.info(`跳过预热: ${config.name} (${sourceId}) - 已禁用`);
    return false;
  }

  if (!config.handler) {
    logger.warn(`跳过预热: ${config.name} (${sourceId}) - 无处理器`);
    return false;
  }

  try {
    logger.info(`🔄 预热中: ${config.name} (${sourceId})`);

    const startTime = Date.now();

    // 执行数据获取
    const items = await Promise.race([
      config.handler(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('预热超时')), WARMUP_CONFIG.timeout)
      )
    ]) as any[];

    const duration = Date.now() - startTime;

    // 保存到缓存
    const cacheTable = await getCacheTable();
    if (cacheTable) {
      await cacheTable.set(sourceId, items);
      logger.success(`✅ 预热完成: ${config.name} - ${items.length} 条数据 (${duration}ms)`);
    } else {
      logger.warn(`⚠️ 缓存不可用: ${config.name}`);
    }

    return true;
  } catch (error) {
    logger.error(`❌ 预热失败: ${config.name} (${sourceId})`, error);
    return false;
  }
}

/**
 * 批量预热数据源（带并发控制）
 */
async function warmupBatch(sourceIds: string[]): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };

  // 分批处理，控制并发
  for (let i = 0; i < sourceIds.length; i += WARMUP_CONFIG.concurrency) {
    const batch = sourceIds.slice(i, i + WARMUP_CONFIG.concurrency);

    // 并行处理当前批次
    const batchResults = await Promise.all(
      batch.map(async (sourceId, index) => {
        // 在批次内添加延迟，避免同时请求
        await sleep(index * WARMUP_CONFIG.delayBetweenRequests);

        const success = await warmupSource(sourceId);
        return success;
      })
    );

    // 统计结果
    batchResults.forEach(success => {
      if (success) results.success++;
      else results.failed++;
    });

    // 批次间延迟
    if (i + WARMUP_CONFIG.concurrency < sourceIds.length) {
      await sleep(1000); // 1秒间隔
    }
  }

  return results;
}

/**
 * 智能预热策略
 */
async function smartWarmup() {
  logger.info('🚀 开始缓存预热...');

  const startTime = Date.now();

  // 1. 获取所有启用的数据源
  const enabledSources = sourceRegistry.listEnabled();

  if (enabledSources.length === 0) {
    logger.warn('没有可用的数据源进行预热');
    return;
  }

  // 2. 优先预热热门数据源
  const prioritySources = WARMUP_CONFIG.prioritySources.filter(id =>
    sourceRegistry.has(id) && sourceRegistry.get(id)?.enabled
  );

  // 3. 其他数据源按需预热（可选）
  const otherSources = enabledSources
    .map(s => s.id)
    .filter(id => !prioritySources.includes(id))
    .slice(0, 10); // 最多预热10个其他源

  const totalToWarmup = [...prioritySources, ...otherSources];

  logger.info(`📊 预热计划: ${prioritySources.length} 个热门源 + ${otherSources.length} 个其他源 = ${totalToWarmup.length} 个数据源`);

  // 4. 执行预热
  const results = await warmupBatch(totalToWarmup);

  const duration = Date.now() - startTime;

  logger.info(`✅ 预热完成: 成功 ${results.success} 个, 失败 ${results.failed} 个, 耗时 ${duration}ms`);

  // 5. 输出预热统计
  if (results.success > 0) {
    const cacheTable = await getCacheTable();
    if (cacheTable) {
      const cached = await cacheTable.getEntire(prioritySources);
      const totalItems = cached.reduce((sum, item) => sum + (item.items?.length || 0), 0);
      logger.info(`📈 缓存统计: ${totalItems} 条热点数据已就绪`);
    }
  }
}

/**
 * 定时预热（保持缓存新鲜）
 */
function scheduleWarmup() {
  // 每10分钟预热一次热门数据源
  const interval = 10 * 60 * 1000;

  setInterval(async () => {
    logger.info('⏰ 定时预热开始...');
    const prioritySources = WARMUP_CONFIG.prioritySources.filter(id =>
      sourceRegistry.has(id) && sourceRegistry.get(id)?.enabled
    );
    await warmupBatch(prioritySources);
    logger.info('⏰ 定时预热完成');
  }, interval);
}

/**
 * Nitro 插件入口
 */
export default defineNitroPlugin(async () => {
  // 服务器启动完成后进行预热（延迟3秒，让其他插件先初始化）
  setTimeout(async () => {
    try {
      await smartWarmup();

      // 启动定时预热
      if (process.env.NODE_ENV === 'production') {
        scheduleWarmup();
        logger.info('⏰ 定时预热任务已启动');
      }
    } catch (error) {
      logger.error('缓存预热失败:', error);
    }
  }, 3000);
});