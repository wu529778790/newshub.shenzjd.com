import { sourceRegistry } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';
import { getCacheTable } from '~/server/database/cache';
import { warmupCache } from '~/server/utils/cache-warmup';

/**
 * 缓存预热插件
 * 在服务器启动时自动预热热门数据源，避免首次请求慢的问题
 */

// 预热策略配置（优化版）
const WARMUP_CONFIG = {
  // 高优先级预热源（用户最常访问）
  highPriority: ['weibo', 'baidu', 'zhihu', 'bilibili'],

  // 中优先级预热源
  mediumPriority: ['douyin', 'hupu', 'tieba', 'toutiao', 'ithome', 'xueqiu'],

  // 并发预热数量
  concurrency: 2,

  // 预热延迟（避免同时请求导致被限流）
  delayBetweenRequests: 300, // ms

  // 超时时间
  timeout: 20000,
};

/**
 * 延迟函数
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 智能预热策略（分批执行）
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

  // 2. 高优先级预热源
  const highPriority = WARMUP_CONFIG.highPriority.filter(id =>
    sourceRegistry.has(id) && sourceRegistry.get(id)?.enabled
  );

  // 3. 中优先级预热源
  const mediumPriority = WARMUP_CONFIG.mediumPriority.filter(id =>
    sourceRegistry.has(id) && sourceRegistry.get(id)?.enabled
  );

  // 4. 其他数据源（可选，最多5个）
  const allIds = enabledSources.map(s => s.id);
  const otherSources = allIds
    .filter(id => !highPriority.includes(id) && !mediumPriority.includes(id))
    .slice(0, 5);

  const totalToWarmup = [...highPriority, ...mediumPriority, ...otherSources];

  logger.info(`📊 预热计划: 高优先级 ${highPriority.length} + 中优先级 ${mediumPriority.length} + 其他 ${otherSources.length} = ${totalToWarmup.length} 个数据源`);

  // 5. 分阶段执行预热（避免启动时请求风暴）

  // 阶段1: 高优先级立即预热
  if (highPriority.length > 0) {
    logger.info(`📥 阶段1: 预热高优先级源 (${highPriority.length}个)`);
    await warmupCache({ sources: highPriority });
    await sleep(1000); // 间隔1秒
  }

  // 阶段2: 中优先级延迟预热
  if (mediumPriority.length > 0) {
    logger.info(`📥 阶段2: 预热中优先级源 (${mediumPriority.length}个)`);
    await warmupCache({ sources: mediumPriority });
    await sleep(1000); // 间隔1秒
  }

  // 阶段3: 其他源最后预热
  if (otherSources.length > 0) {
    logger.info(`📥 阶段3: 预热其他源 (${otherSources.length}个)`);
    await warmupCache({ sources: otherSources });
  }

  const duration = Date.now() - startTime;
  logger.info(`✅ 预热完成，总耗时 ${duration}ms`);

  // 6. 输出缓存统计
  const cacheTable = await getCacheTable();
  if (cacheTable && highPriority.length > 0) {
    const cached = await cacheTable.getEntire(highPriority);
    const totalItems = cached.reduce((sum, item) => sum + (item.items?.length || 0), 0);
    logger.info(`📈 缓存统计: ${totalItems} 条热点数据已就绪`);
  }
}

/**
 * 定时预热（保持缓存新鲜）
 * 仅预热高优先级源，避免资源浪费
 */
function scheduleWarmup() {
  // 每10分钟预热一次高优先级数据源
  const interval = 10 * 60 * 1000;

  setInterval(async () => {
    logger.info('⏰ 定时预热开始...');
    const highPriority = WARMUP_CONFIG.highPriority.filter(id =>
      sourceRegistry.has(id) && sourceRegistry.get(id)?.enabled
    );

    if (highPriority.length > 0) {
      await warmupCache({ sources: highPriority });
      logger.info('⏰ 定时预热完成');
    }
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

      // 启动定时预热（仅生产环境）
      if (process.env.NODE_ENV === 'production') {
        scheduleWarmup();
        logger.info('⏰ 定时预热任务已启动 (每10分钟)');
      }
    } catch (error) {
      logger.error('缓存预热失败:', error);
    }
  }, 3000);
});