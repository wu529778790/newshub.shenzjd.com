/**
 * GET /api/v1/metrics/profiler
 * 获取性能分析数据
 */

import { CallTracer } from '~/server/utils/profiler';

export default defineEventHandler(async (event) => {
  const stats = CallTracer.getStats();

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    summary: {
      totalCalls: stats.totalCalls,
      successRate: stats.successRate.toFixed(2) + '%',
      avgDuration: Math.round(stats.avgDuration) + 'ms',
    },
    slowestCalls: stats.slowestCalls,
  };
});
