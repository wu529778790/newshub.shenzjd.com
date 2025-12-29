import { sourceManager } from '~/server/services/source-manager';

/**
 * GET /api/v1/health
 * 系统健康检查和监控指标
 */
export default defineEventHandler(() => {
  const stats = sourceManager.getStats();
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  // 计算健康状态
  const healthStatus = stats.health.healthy > 0
    ? (stats.health.degraded > 0 ? 'degraded' : 'healthy')
    : 'unhealthy';

  // 获取详细的数据源健康信息
  const sourceHealthDetails = sourceManager.listAllSources().map(source => {
    const health = sourceManager.isAvailable(source.id) ? 'available' : 'unavailable';
    const metrics = stats.metrics[source.id];

    return {
      id: source.id,
      name: source.name,
      health,
      enabled: source.enabled,
      disable: source.disable,
      metrics: metrics ? {
        totalRequests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0
          ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%'
          : 'N/A',
        avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
        lastSuccess: metrics.lastSuccess ? new Date(metrics.lastSuccess).toISOString() : null,
        lastError: metrics.lastError ? new Date(metrics.lastError).toISOString() : null,
        errorCount: metrics.failedRequests,
      } : null,
    };
  });

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    status: healthStatus,
    system: {
      uptime: Math.round(uptime) + 's',
      nodeVersion: process.version,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
      },
    },
    sources: {
      total: stats.total,
      enabled: stats.enabled,
      health: stats.health,
    },
    details: sourceHealthDetails,
  };
});
