/**
 * 监控和可观测性系统
 * 提供性能指标、错误追踪、健康检查等功能
 */

import { logger } from './logger';

/**
 * 指标数据类型
 */
export interface MetricsData {
  // 性能指标
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // 数据源指标
  sourceSuccess: Record<string, number>;
  sourceFailure: Record<string, number>;
  sourceAvgTime: Record<string, number>;

  // 缓存指标
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;

  // 系统指标
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
}

/**
 * 单次请求的指标记录
 */
interface RequestMetrics {
  startTime: number;
  endTime: number;
  sourceId: string;
  success: boolean;
  error?: string;
}

/**
 * 监控管理器
 */
export class MetricsManager {
  private static instance: MetricsManager;

  private metrics: MetricsData = {
    totalRequests: 0,
    totalErrors: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    sourceSuccess: {},
    sourceFailure: {},
    sourceAvgTime: {},
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    uptime: Date.now(),
    memoryUsage: {} as NodeJS.MemoryUsage,
    timestamp: Date.now(),
  };

  private responseTimes: number[] = [];
  private startTime = Date.now();

  private constructor() {
    // 定期更新系统指标
    setInterval(() => this.updateSystemMetrics(), 30000); // 每30秒更新一次
  }

  static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  /**
   * 记录请求开始
   */
  recordRequestStart(sourceId: string): RequestMetrics {
    return {
      startTime: Date.now(),
      endTime: 0,
      sourceId,
      success: false,
    };
  }

  /**
   * 记录请求结束
   */
  recordRequestEnd(metrics: RequestMetrics, error?: Error): void {
    metrics.endTime = Date.now();
    metrics.success = !error;
    metrics.error = error?.message;

    const duration = metrics.endTime - metrics.startTime;

    // 更新总指标
    this.metrics.totalRequests++;
    this.responseTimes.push(duration);

    // 如果有错误
    if (error) {
      this.metrics.totalErrors++;
      if (!this.metrics.sourceFailure[metrics.sourceId]) {
        this.metrics.sourceFailure[metrics.sourceId] = 0;
      }
      this.metrics.sourceFailure[metrics.sourceId]++;
      logger.warn(`[Metrics] ${metrics.sourceId} failed: ${error.message}`);
    } else {
      if (!this.metrics.sourceSuccess[metrics.sourceId]) {
        this.metrics.sourceSuccess[metrics.sourceId] = 0;
      }
      this.metrics.sourceSuccess[metrics.sourceId]++;
    }

    // 更新数据源平均响应时间
    if (!this.metrics.sourceAvgTime[metrics.sourceId]) {
      this.metrics.sourceAvgTime[metrics.sourceId] = 0;
    }
    const currentAvg = this.metrics.sourceAvgTime[metrics.sourceId];
    const count = (this.metrics.sourceSuccess[metrics.sourceId] || 0) + (this.metrics.sourceFailure[metrics.sourceId] || 0);
    this.metrics.sourceAvgTime[metrics.sourceId] = (currentAvg * (count - 1) + duration) / count;

    // 重新计算响应时间统计
    this.recalculateResponseTimes();

    // 记录详细日志
    logger.info(`[Metrics] ${metrics.sourceId} ${metrics.success ? '✓' : '✗'} ${duration}ms`);
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
    this.updateCacheHitRate();
  }

  /**
   * 获取当前指标
   */
  getMetrics(): MetricsData {
    return {
      ...this.metrics,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取健康状态
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    errorRate: number;
    message: string;
  } {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.metrics.totalRequests > 0
      ? this.metrics.totalErrors / this.metrics.totalRequests
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = '系统运行正常';

    if (errorRate > 0.2) {
      status = 'unhealthy';
      message = `错误率过高 (${(errorRate * 100).toFixed(2)}%)`;
    } else if (errorRate > 0.05) {
      status = 'degraded';
      message = `系统性能下降 (${(errorRate * 100).toFixed(2)}%)`;
    }

    return {
      status,
      uptime,
      errorRate,
      message,
    };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      sourceSuccess: {},
      sourceFailure: {},
      sourceAvgTime: {},
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      uptime: Date.now(),
      memoryUsage: {} as NodeJS.MemoryUsage,
      timestamp: Date.now(),
    };
    this.responseTimes = [];
    this.startTime = Date.now();
    logger.info('[Metrics] All metrics reset');
  }

  /**
   * 重新计算响应时间统计
   */
  private recalculateResponseTimes(): void {
    if (this.responseTimes.length === 0) return;

    // 排序以计算分位数
    const sorted = [...this.responseTimes].sort((a, b) => a - b);

    // 平均值
    this.metrics.avgResponseTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    // P95 (95th percentile)
    const p95Index = Math.floor(sorted.length * 0.95);
    this.metrics.p95ResponseTime = sorted[p95Index] || 0;

    // P99 (99th percentile)
    const p99Index = Math.floor(sorted.length * 0.99);
    this.metrics.p99ResponseTime = sorted[p99Index] || 0;

    // 限制数组大小，避免内存泄漏
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (total > 0) {
      this.metrics.cacheHitRate = (this.metrics.cacheHits / total) * 100;
    }
  }

  /**
   * 更新系统指标
   */
  private updateSystemMetrics(): void {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.uptime = Date.now() - this.startTime;

    logger.debug('[Metrics] System metrics updated', {
      uptime: this.formatUptime(this.metrics.uptime),
      memory: this.formatMemory(this.metrics.memoryUsage),
    });
  }

  /**
   * 格式化运行时间
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * 格式化内存使用
   */
  private formatMemory(usage: NodeJS.MemoryUsage): string {
    return `RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`;
  }
}

/**
 * 监控装饰器 - 用于自动记录方法执行指标
 */
export function Monitored(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const metrics = MetricsManager.getInstance();

  descriptor.value = async function (...args: any[]) {
    const sourceId = args[0]?.id || args[0]?.sourceId || 'unknown';
    const requestMetrics = metrics.recordRequestStart(sourceId);

    try {
      const result = await originalMethod.apply(this, args);
      metrics.recordRequestEnd(requestMetrics);
      return result;
    } catch (error) {
      metrics.recordRequestEnd(requestMetrics, error as Error);
      throw error;
    }
  };

  return descriptor;
}

/**
 * 健康检查管理器
 */
export class HealthCheckManager {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private results: Map<string, { status: boolean; lastCheck: number; error?: string }> = new Map();

  /**
   * 注册健康检查
   */
  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  /**
   * 运行所有健康检查
   */
  async runAll(): Promise<Record<string, { status: boolean; error?: string }>> {
    const results: Record<string, { status: boolean; error?: string }> = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        const status = await check();
        results[name] = { status };
        this.results.set(name, { status, lastCheck: Date.now() });

        if (!status) {
          logger.warn(`[HealthCheck] ${name} check failed`);
        }
      } catch (error) {
        results[name] = { status: false, error: (error as Error).message };
        this.results.set(name, {
          status: false,
          lastCheck: Date.now(),
          error: (error as Error).message
        });
        logger.error(`[HealthCheck] ${name} error:`, error);
      }
    }

    return results;
  }

  /**
   * 获取健康检查结果
   */
  getResults(): Record<string, { status: boolean; lastCheck: number; error?: string }> {
    const result: Record<string, any> = {};
    this.results.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 获取整体健康状态
   */
  getOverallHealth(): boolean {
    for (const [name, result] of this.results.entries()) {
      if (!result.status) {
        return false;
      }
    }
    return this.results.size > 0;
  }
}

// 全局单例
export const metrics = MetricsManager.getInstance();
export const healthCheck = new HealthCheckManager();
