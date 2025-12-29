/**
 * GET /api/v1/metrics
 * 获取系统指标和性能数据
 */

import { metrics } from '~/server/utils/metrics';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const detailed = query.detailed === 'true';

  const metricsData = metrics.getMetrics();
  const health = metrics.getHealth();

  if (!detailed) {
    // 返回简化的指标
    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      health,
      summary: {
        totalRequests: metricsData.totalRequests,
        totalErrors: metricsData.totalErrors,
        errorRate: metricsData.totalRequests > 0
          ? (metricsData.totalErrors / metricsData.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: Math.round(metricsData.avgResponseTime) + 'ms',
        cacheHitRate: metricsData.cacheHitRate.toFixed(2) + '%',
        uptime: formatUptime(Date.now() - metricsData.uptime),
      },
    };
  }

  // 返回详细指标
  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    health,
    performance: {
      totalRequests: metricsData.totalRequests,
      totalErrors: metricsData.totalErrors,
      responseTimes: {
        avg: Math.round(metricsData.avgResponseTime) + 'ms',
        p95: Math.round(metricsData.p95ResponseTime) + 'ms',
        p99: Math.round(metricsData.p99ResponseTime) + 'ms',
      },
    },
    cache: {
      hits: metricsData.cacheHits,
      misses: metricsData.cacheMisses,
      hitRate: metricsData.cacheHitRate.toFixed(2) + '%',
    },
    dataSources: {
      success: metricsData.sourceSuccess,
      failure: metricsData.sourceFailure,
      avgTime: Object.entries(metricsData.sourceAvgTime).reduce((acc, [key, value]) => {
        acc[key] = Math.round(value) + 'ms';
        return acc;
      }, {} as Record<string, string>),
    },
    system: {
      uptime: formatUptime(Date.now() - metricsData.uptime),
      memory: {
        heapUsed: (metricsData.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        rss: (metricsData.memoryUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
      },
    },
  };
});

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
