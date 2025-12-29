import type { NewsItem } from '@shared/types';
import { sourceRegistry, type DataSourceConfig } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';

/**
 * 数据源管理器
 * 提供统一的数据源操作接口
 */
export class SourceManager {
  /**
   * 获取单个数据源的数据
   */
  async getHotList(id: string, options: { force?: boolean } = {}): Promise<NewsItem[]> {
    const config = sourceRegistry.get(id);

    if (!config) {
      throw new Error(`数据源不存在: ${id}`);
    }

    if (!config.enabled) {
      logger.warn(`数据源 ${id} 未启用`);
      return [];
    }

    if (config.disable === true) {
      logger.warn(`数据源 ${id} 已禁用`);
      return [];
    }

    try {
      // TODO: 在缓存系统实现后，这里会先检查缓存
      const data = await config.handler();
      return data;
    } catch (error) {
      logger.error(`获取数据源 ${id} 失败:`, error);
      return [];
    }
  }

  /**
   * 批量获取多个数据源的数据
   */
  async getHotLists(
    ids: string[],
    options: { force?: boolean; concurrency?: number } = {}
  ): Promise<Record<string, { success: boolean; data: NewsItem[]; error?: string }>> {
    const { force = false, concurrency = 5 } = options;

    const results: Record<string, { success: boolean; data: NewsItem[]; error?: string }> = {};

    // 分批处理，控制并发
    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency);

      await Promise.allSettled(
        batch.map(async (id) => {
          try {
            const data = await this.getHotList(id, { force });
            results[id] = { success: true, data };
          } catch (error) {
            results[id] = {
              success: false,
              data: [],
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
      );
    }

    return results;
  }

  /**
   * 获取所有启用的数据源
   */
  listEnabledSources(): DataSourceConfig[] {
    return sourceRegistry.listEnabled();
  }

  /**
   * 获取所有数据源列表（包含配置）
   */
  listAllSources(): DataSourceConfig[] {
    return sourceRegistry.list();
  }

  /**
   * 获取数据源信息
   */
  getSourceInfo(id: string): DataSourceConfig | undefined {
    return sourceRegistry.get(id);
  }

  /**
   * 检查数据源是否可用
   */
  isAvailable(id: string): boolean {
    const config = sourceRegistry.get(id);
    if (!config || !config.enabled || config.disable === true) {
      return false;
    }

    const health = sourceRegistry.getHealth(id);
    return health.status === 'healthy' || health.status === 'degraded';
  }

  /**
   * 获取数据源统计信息
   */
  getStats() {
    const allSources = sourceRegistry.list();
    const enabledSources = sourceRegistry.listEnabled();
    const metrics = sourceRegistry.getAllMetrics();

    const healthStats = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0
    };

    Object.keys(metrics).forEach(id => {
      const health = sourceRegistry.getHealth(id);
      healthStats[health.status]++;
    });

    return {
      total: allSources.length,
      enabled: enabledSources.length,
      health: healthStats,
      metrics
    };
  }

  /**
   * 注册新的数据源（动态添加）
   */
  registerSource(config: DataSourceConfig): void {
    sourceRegistry.register(config);
  }

  /**
   * 批量注册数据源
   */
  registerSources(configs: DataSourceConfig[]): void {
    sourceRegistry.registerBatch(configs);
  }
}

/**
 * 单例实例
 */
export const sourceManager = new SourceManager();

/**
 * 便捷函数
 */
export async function getHotList(id: string, options?: { force?: boolean }) {
  return sourceManager.getHotList(id, options);
}

export async function getHotLists(ids: string[], options?: { force?: boolean; concurrency?: number }) {
  return sourceManager.getHotLists(ids, options);
}

export function listSources() {
  return sourceManager.listEnabledSources();
}
