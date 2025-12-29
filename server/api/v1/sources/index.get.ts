import { sourceManager } from '~/server/services/source-manager';

/**
 * GET /api/v1/sources
 * 获取所有数据源列表及其配置信息
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const includeDisabled = query.includeDisabled === 'true';
  const includeMetrics = query.metrics === 'true';

  // 获取数据源列表
  const sources = includeDisabled
    ? sourceManager.listAllSources()
    : sourceManager.listEnabledSources();

  // 如果需要，添加指标信息
  const result = sources.map(source => {
    const item: any = {
      id: source.id,
      name: source.name,
      home: source.home,
      type: source.type,
      interval: source.interval,
      enabled: source.enabled,
      column: source.column,
      color: source.color,
      title: source.title,
      desc: source.desc,
      disable: source.disable,
    };

    if (includeMetrics) {
      const metrics = sourceManager.getStats().metrics[source.id];
      if (metrics) {
        item.metrics = {
          totalRequests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0
            ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%'
            : 'N/A',
          avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
          lastSuccess: metrics.lastSuccess,
          lastError: metrics.lastError,
        };
      }

      const health = sourceManager.getSourceInfo(source.id);
      if (health) {
        item.health = sourceManager.isAvailable(source.id) ? 'available' : 'unavailable';
      }
    }

    return item;
  });

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    count: result.length,
    sources: result,
  };
});
