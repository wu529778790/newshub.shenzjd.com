/**
 * 请求日志插件
 * 自动记录所有请求到日志系统
 */

import { requestLogger, useRequestLogger } from '~/server/utils/request-logger';

export default defineNitroPlugin((nitroApp) => {
  // 使用中间件记录请求
  nitroApp.hooks.hook('request', (event) => {
    // 为请求添加日志记录
    const originalEnd = event.node.res.end;
    const start = Date.now();

    event.node.res.end = function (...args: any[]) {
      const duration = Date.now() - start;
      requestLogger.log(event, duration);
      return originalEnd.apply(this, args);
    };
  });

  // 日志清理定时器（每天凌晨清理一次）
  const cleanupTimer = setInterval(() => {
    const hour = new Date().getHours();
    if (hour === 3) { // 凌晨 3 点
      const stats = requestLogger.getStats();
      if (stats.totalRequests > 5000) {
        requestLogger.clear();
        console.log('[RequestLogger] 日志已清理');
      }
    }
  }, 3600000); // 每小时检查一次

  // 服务器关闭时清理
  nitroApp.hooks.hook('close', () => {
    clearInterval(cleanupTimer);
  });
});
