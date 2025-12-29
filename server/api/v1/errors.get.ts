import { ErrorHandler } from '~/server/utils/error-handler';

/**
 * GET /api/v1/errors
 * 获取错误统计和监控信息
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const sourceId = query.source as string;

  const handler = ErrorHandler.getInstance();
  const stats = handler.getStats(sourceId);

  // 格式化响应
  const formattedStats = sourceId
    ? {
        sourceId,
        ...stats,
        errorTypes: stats?.errorTypes || {},
        totalErrors: stats ? Object.values(stats.errorTypes).reduce((a, b) => a + b, 0) : 0,
      }
    : Object.entries(stats).map(([id, stat]) => ({
        sourceId: id,
        ...stat,
        errorTypes: stat.errorTypes,
        totalErrors: Object.values(stat.errorTypes).reduce((a, b) => a + b, 0),
      }));

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    sourceId: sourceId || 'all',
    stats: formattedStats,
  };
});
