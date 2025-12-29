/**
 * GET /api/v1/logs
 * 获取请求日志和统计
 */

import { requestLogger } from '~/server/utils/request-logger';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = Number(query.limit) || 50;
  const path = query.path as string;
  const stats = query.stats === 'true';

  // 返回统计信息
  if (stats) {
    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      data: requestLogger.getStats(),
    };
  }

  // 按路径过滤
  if (path) {
    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      data: requestLogger.getLogsByPath(path),
    };
  }

  // 返回最近日志
  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    data: requestLogger.getLogs(limit),
  };
});
