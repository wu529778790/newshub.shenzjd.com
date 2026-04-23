import { requestLogger } from '~/server/utils/request-logger';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const limit = Math.max(1, Math.min(Number(query.limit) || 50, 200));
  const path = typeof query.path === 'string' ? query.path : '';

  const logs = path
    ? requestLogger.getLogsByPath(path).slice(0, limit)
    : requestLogger.getLogs(limit);

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    count: logs.length,
    logs,
    stats: requestLogger.getStats(),
  };
});
