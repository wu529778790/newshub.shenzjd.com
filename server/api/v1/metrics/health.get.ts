/**
 * GET /api/v1/metrics/health
 * 健康检查端点
 */

import { metrics, healthCheck } from '~/server/utils/metrics';

export default defineEventHandler(async (event) => {
  // 运行所有健康检查
  const checks = await healthCheck.runAll();
  const overallHealth = healthCheck.getOverallHealth();
  const systemHealth = metrics.getHealth();

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    status: overallHealth && systemHealth.status === 'healthy' ? 'healthy' : 'degraded',
    system: {
      status: systemHealth.status,
      uptime: formatUptime(systemHealth.uptime),
      errorRate: (systemHealth.errorRate * 100).toFixed(2) + '%',
      message: systemHealth.message,
    },
    checks,
    metadata: {
      totalChecks: Object.keys(checks).length,
      passed: Object.values(checks).filter(c => c.status).length,
      failed: Object.values(checks).filter(c => !c.status).length,
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
