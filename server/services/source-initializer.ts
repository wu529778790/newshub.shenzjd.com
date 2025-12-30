import { sourceRegistry, type DataSourceConfig } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';
import type { NewsItem } from '@shared/types';

/**
 * 数据源初始化器
 * 负责将现有的数据源配置转换为新的注册表格式
 */

// 数据源映射表（从 hot-list.service.ts 迁移）
const sourceHandlers: Record<string, () => Promise<NewsItem[]>> = {};

/**
 * 注册单个数据源处理器（用于迁移现有代码）
 */
export function registerSourceHandler(id: string, handler: () => Promise<NewsItem[]>) {
  sourceHandlers[id] = handler;
}

/**
 * 批量注册数据源处理器
 */
export function registerSourceHandlers(handlers: Record<string, () => Promise<NewsItem[]>>) {
  Object.assign(sourceHandlers, handlers);
}

/**
 * 从旧的 hot-list.service.ts 导入格式转换
 * 这是一个过渡方案，用于兼容现有代码
 */
export async function migrateFromOldService(oldFetchers: Record<string, () => Promise<NewsItem[]>>) {
  logger.info('从旧服务迁移数据源处理器...');

  // 从 pre-sources 导入配置（使用动态 import）
  const preSources = await import('../../shared/pre-sources');
  const originSources = preSources.originSources;

  for (const [id, handler] of Object.entries(oldFetchers)) {
    const config = id in originSources ? (originSources as any)[id] : undefined;

    if (!config) {
      logger.warn(`未找到 ${id} 的配置，跳过迁移`);
      continue;
    }

    // 处理子源（如 wallstreetcn-news）
    if (id.includes('-')) {
      const [parentId, subId] = id.split('-');
      const parentConfig = (originSources as any)[parentId];

      if (parentConfig?.sub?.[subId]) {
        const subConfig = parentConfig.sub[subId];

        sourceRegistry.register({
          id,
          name: parentConfig.name,
          home: parentConfig.home || '',
          type: (subConfig.type || parentConfig.type || 'hotspot') as any,
          interval: subConfig.interval || parentConfig.interval || 600000,
          enabled: !subConfig.disable && !parentConfig.disable,
          column: subConfig.column || parentConfig.column,
          color: subConfig.color || parentConfig.color,
          title: subConfig.title,
          desc: parentConfig.desc,
          disable: subConfig.disable || parentConfig.disable,
          handler
        });
      }
    } else {
      // 主源
      sourceRegistry.register({
        id,
        name: config.name,
        home: config.home || '',
        type: (config.type || 'hotspot') as any,
        interval: config.interval || 600000,
        enabled: !config.disable,
        column: config.column,
        color: config.color,
        title: config.title,
        desc: config.desc,
        disable: config.disable,
        handler
      });
    }
  }

  logger.info(`✓ 迁移完成，当前注册 ${sourceRegistry.size} 个数据源`);
}
