/**
 * 请求日志记录器
 * 结构化日志，支持多种输出格式
 */

import { logger } from './logger';

export interface RequestLog {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  error?: string;
}

export class RequestLogger {
  private logs: RequestLog[] = [];
  private maxLogs = 1000;

  /**
   * 记录请求
   */
  log(event: any, duration: number): void {
    const req = event.node.req;
    const res = event.node.res;

    const log: RequestLog = {
      timestamp: Date.now(),
      method: req.method || 'GET',
      path: req.url || '/',
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
    };

    // 添加到内存
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 输出到控制台
    this.output(log);
  }

  /**
   * 输出日志到控制台
   */
  private output(log: RequestLog): void {
    const statusColor = log.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    const durationColor = log.duration > 1000 ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';

    logger.info(
      `${durationColor}${log.duration}ms${reset} ` +
      `${statusColor}${log.statusCode}${reset} ` +
      `${log.method} ${log.path}` +
      (log.ip ? ` from ${log.ip}` : '')
    );
  }

  /**
   * 获取客户端 IP
   */
  private getClientIP(req: any): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;

    return req.socket?.remoteAddress || null;
  }

  /**
   * 获取最近的日志
   */
  getLogs(limit = 50): RequestLog[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * 按路径过滤日志
   */
  getLogsByPath(path: string): RequestLog[] {
    return this.logs.filter(log => log.path.includes(path));
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    topPaths: Array<{ path: string; count: number }>;
  } {
    const total = this.logs.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        errorRate: 0,
        topPaths: [],
      };
    }

    const avgDuration = this.logs.reduce((sum, log) => sum + log.duration, 0) / total;
    const errors = this.logs.filter(log => log.statusCode >= 400).length;
    const errorRate = (errors / total) * 100;

    // 统计热门路径
    const pathCounts = new Map<string, number>();
    this.logs.forEach(log => {
      pathCounts.set(log.path, (pathCounts.get(log.path) || 0) + 1);
    });

    const topPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return {
      totalRequests: total,
      avgDuration: Math.round(avgDuration),
      errorRate: Number(errorRate.toFixed(2)),
      topPaths,
    };
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  export(): RequestLog[] {
    return [...this.logs];
  }
}

/**
 * 全局请求日志器
 */
export const requestLogger = new RequestLogger();

/**
 * 中间件：自动记录请求
 */
export function useRequestLogger(event: any, next: () => Promise<void>): Promise<void> {
  const start = Date.now();

  return next().finally(() => {
    const duration = Date.now() - start;
    requestLogger.log(event, duration);
  });
}
