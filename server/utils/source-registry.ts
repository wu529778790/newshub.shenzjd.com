import type { NewsItem } from '@shared/types';
import { logger } from './logger';

/**
 * 数据源类型
 */
export type DataSourceType = 'realtime' | 'hotspot' | 'news';

/**
 * 数据源配置接口
 */
export interface DataSourceConfig {
  /** 数据源唯一标识 */
  id: string;
  /** 数据源名称 */
  name: string;
  /** 主页URL */
  home: string;
  /** 数据类型 */
  type: DataSourceType;
  /** 刷新间隔（毫秒） */
  interval: number;
  /** 是否启用 */
  enabled: boolean;
  /** 列分类 */
  column?: string;
  /** 颜色主题 */
  color?: string;
  /** 标题 */
  title?: string;
  /** 描述 */
  desc?: string;
  /** 禁用原因（用于Cloudflare等特殊情况） */
  disable?: boolean | 'cf';
  /** 数据获取处理器 */
  handler: () => Promise<NewsItem[]>;
}

/**
 * 数据源注册器
 * 自动扫描并注册所有数据源，避免硬编码
 */
export class SourceRegistry {
  private sources = new Map<string, DataSourceConfig>();
  private metrics = new Map<string, SourceMetrics>();

  /**
   * 注册单个数据源
   */
  register(config: DataSourceConfig): void {
    if (this.sources.has(config.id)) {
      logger.warn(`数据源 ${config.id} 已存在，将被覆盖`);
    }
    this.sources.set(config.id, config);

    // 初始化指标
    if (!this.metrics.has(config.id)) {
      this.metrics.set(config.id, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        lastSuccess: null,
        lastError: null,
        errorTypes: {}
      });
    }

    logger.info(`✓ 注册数据源: ${config.name} (${config.id})`);
  }

  /**
   * 批量注册数据源
   */
  registerBatch(configs: DataSourceConfig[]): void {
    configs.forEach(config => this.register(config));
  }

  /**
   * 获取数据源配置
   */
  get(id: string): DataSourceConfig | undefined {
    return this.sources.get(id);
  }

  /**
   * 获取所有数据源
   */
  list(filter?: Partial<DataSourceConfig>): DataSourceConfig[] {
    const entries = Array.from(this.sources.entries());
    let result = entries.map(([, config]) => config);

    if (filter) {
      result = result.filter(config => {
        return Object.entries(filter).every(([key, value]) => {
          return config[key as keyof DataSourceConfig] === value;
        });
      });
    }

    return result;
  }

  /**
   * 获取启用的数据源
   */
  listEnabled(): DataSourceConfig[] {
    return this.list({ enabled: true }).filter(
      config => !config.disable || config.disable === 'cf'
    );
  }

  /**
   * 检查数据源是否存在
   */
  has(id: string): boolean {
    return this.sources.has(id);
  }

  /**
   * 获取数据源数量
   */
  get size(): number {
    return this.sources.size;
  }

  /**
   * 记录请求指标
   */
  recordMetrics(
    sourceId: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const metric = this.metrics.get(sourceId);
    if (!metric) return;

    metric.totalRequests++;

    if (success) {
      metric.successfulRequests++;
      metric.lastSuccess = Date.now();
    } else {
      metric.failedRequests++;
      metric.lastError = Date.now();

      if (error) {
        const errorType = error.name || 'Unknown';
        metric.errorTypes[errorType] = (metric.errorTypes[errorType] || 0) + 1;
      }
    }

    // 更新平均响应时间
    const oldAvg = metric.avgResponseTime;
    const newAvg = (oldAvg * (metric.totalRequests - 1) + duration) / metric.totalRequests;
    metric.avgResponseTime = newAvg;

    this.metrics.set(sourceId, metric);
  }

  /**
   * 获取数据源指标
   */
  getMetrics(sourceId: string): SourceMetrics | undefined {
    return this.metrics.get(sourceId);
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Record<string, SourceMetrics> {
    const result: Record<string, SourceMetrics> = {};
    this.metrics.forEach((metric, id) => {
      result[id] = { ...metric };
    });
    return result;
  }

  /**
   * 获取数据源健康状态
   */
  getHealth(sourceId: string): SourceHealth {
    const metric = this.metrics.get(sourceId);
    const config = this.sources.get(sourceId);

    if (!metric || !config) {
      return { status: 'unknown', reason: 'No metrics available' };
    }

    if (metric.totalRequests === 0) {
      return { status: 'unknown', reason: 'No requests yet' };
    }

    const successRate = metric.successfulRequests / metric.totalRequests;

    // 最近5分钟有错误
    const recentError = metric.lastError &&
      (Date.now() - metric.lastError) < 5 * 60 * 1000;

    if (successRate < 0.5) {
      return { status: 'unhealthy', reason: `Success rate too low: ${(successRate * 100).toFixed(1)}%` };
    }

    if (recentError) {
      return { status: 'degraded', reason: 'Recent errors detected' };
    }

    if (successRate < 0.8) {
      return { status: 'degraded', reason: `Success rate degraded: ${(successRate * 100).toFixed(1)}%` };
    }

    return { status: 'healthy' };
  }

  /**
   * 自动扫描并注册数据源（按需使用）
   */
  async autoScan(dir: string = './server/sources'): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const files = await fs.readdir(dir);

      for (const file of files) {
        // 跳过非TypeScript文件和特殊文件
        if (!file.endsWith('.ts') || file.startsWith('_') || file === 'registry.ts') {
          continue;
        }

        try {
          const modulePath = path.join(dir, file);
          const module = await import(modulePath);

          // 支持多种导出格式
          const exportData = module.default || module;

          if (exportData && typeof exportData === 'object') {
            // 处理 defineSource({ id: handler }) 格式
            if (exportData.id && exportData.handler) {
              this.register(exportData as DataSourceConfig);
            }
            // 处理 defineSource({ weibo: handler, zhihu: handler }) 格式
            else {
              for (const [key, value] of Object.entries(exportData)) {
                if (typeof value === 'function') {
                  // 从 pre-sources 获取配置
                  const config = await this.getSourceConfigFromPreSources(key);
                  if (config) {
                    this.register({
                      ...config,
                      id: key,
                      handler: value as () => Promise<NewsItem[]>
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error(`扫描数据源 ${file} 失败:`, error);
        }
      }
    } catch (error) {
      logger.error('自动扫描失败:', error);
    }
  }

  /**
   * 从 pre-sources 获取配置（临时兼容方案）
   */
  private async getSourceConfigFromPreSources(id: string): Promise<Omit<DataSourceConfig, 'id' | 'handler'> | null> {
    try {
      const preSources = await import('../services/sources');
      const source = preSources.sources.find(s => s.id === id);

      if (!source) return null;

      // 从 shared/pre-sources 获取更多配置
      const preConfig = await import('../../shared/pre-sources');
      const originSource = (preConfig.originSources as any)[id];

      return {
        name: source.name,
        home: source.home,
        type: (originSource?.type as any) || 'hotspot',
        interval: originSource?.interval || 600000,
        enabled: true,
        column: originSource?.column,
        color: originSource?.color,
        title: originSource?.title,
        desc: originSource?.desc,
      };
    } catch {
      return null;
    }
  }
}

/**
 * 单例注册器实例
 */
export const sourceRegistry = new SourceRegistry();

/**
 * 指标接口
 */
export interface SourceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastSuccess: number | null;
  lastError: number | null;
  errorTypes: Record<string, number>;
}

/**
 * 健康状态
 */
export interface SourceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  reason?: string;
}

/**
 * 装饰器：自动注册数据源
 */
export function DataSource(config: Omit<DataSourceConfig, 'handler'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const handler = descriptor.value;

    // 自动包装为正确的格式
    const wrappedHandler = async (): Promise<NewsItem[]> => {
      return await handler();
    };

    sourceRegistry.register({
      ...config,
      handler: wrappedHandler
    });
  };
}

/**
 * 包装器：统一错误处理和指标记录
 */
export async function executeWithMetrics<T>(
  sourceId: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const registry = sourceRegistry;

  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    registry.recordMetrics(sourceId, duration, true);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    registry.recordMetrics(sourceId, duration, false, error as Error);
    throw error;
  }
}
