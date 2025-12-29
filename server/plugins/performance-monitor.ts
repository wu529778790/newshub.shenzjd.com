/**
 * 性能监控插件
 * 自动记录所有 API 请求的性能指标
 */

import { metrics } from '~/server/utils/metrics';
import { Profiler } from '~/server/utils/profiler';

export default defineNitroPlugin((nitroApp) => {
  // 监听请求开始
  nitroApp.hooks.hook('request', (event) => {
    const path = event.node.req.url || '';

    // 只监控 API 请求
    if (path.startsWith('/api/')) {
      // 为请求添加性能追踪
      const profilerId = Profiler.start(`API: ${path}`);
      event.context.profilerId = profilerId;

      // 记录请求开始
      const sourceId = extractSourceId(path);
      if (sourceId) {
        event.context.metrics = metrics.recordRequestStart(sourceId);
      }
    }
  });

  // 监听请求结束
  nitroApp.hooks.hook('response', (event) => {
    const path = event.node.req.url || '';

    if (path.startsWith('/api/')) {
      // 结束性能分析
      if (event.context.profilerId) {
        Profiler.end(event.context.profilerId);
      }

      // 结束指标记录
      if (event.context.metrics) {
        const statusCode = event.node.res.statusCode;
        const error = statusCode >= 400 ? new Error(`HTTP ${statusCode}`) : undefined;
        metrics.recordRequestEnd(event.context.metrics, error);
      }
    }
  });

  // 错误监控
  nitroApp.hooks.hook('error', (error, event) => {
    const path = event?.node.req.url || '';

    if (path.startsWith('/api/')) {
      console.error(`[API Error] ${path}:`, error);

      // 记录错误指标
      if (event?.context.metrics) {
        metrics.recordRequestEnd(event.context.metrics, error);
      }
    }
  });
});

/**
 * 从路径中提取数据源 ID
 */
function extractSourceId(path: string): string | null {
  // /api/v1/sources/:id/hot
  const match = path.match(/\/api\/v1\/sources\/([^\/]+)/);
  if (match) return match[1];

  // /api/hot-list?id=:id
  const url = new URL(path, 'http://localhost');
  const id = url.searchParams.get('id');
  if (id) return id;

  return null;
}
