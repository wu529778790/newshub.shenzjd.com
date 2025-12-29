import { sourceManager } from '~/server/services/source-manager';
import { z } from 'zod';

/**
 * GET /api/v1/sources/:id
 * 获取单个数据源的数据
 *
 * 查询参数:
 * - force: 是否强制刷新（忽略缓存）
 * - limit: 返回条数限制
 */
export default defineEventHandler(async (event) => {
  // 参数验证
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing source ID',
    });
  }

  // 查询参数验证
  const query = getQuery(event);
  const schema = z.object({
    force: z.coerce.boolean().default(false),
    limit: z.coerce.number().min(1).max(50).default(20),
  });

  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: parsed.error.issues,
    });
  }

  const { force, limit } = parsed.data;

  // 检查数据源是否存在
  const sourceInfo = sourceManager.getSourceInfo(id);

  if (!sourceInfo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source not found',
      data: { id },
    });
  }

  // 检查数据源是否可用
  if (!sourceManager.isAvailable(id)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Source temporarily unavailable',
      data: { id, reason: 'Health check failed' },
    });
  }

  try {
    // 获取数据
    const items = await sourceManager.getHotList(id, { force });

    // 应用限制
    const limitedItems = items.slice(0, limit);

    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      source: {
        id: sourceInfo.id,
        name: sourceInfo.name,
        home: sourceInfo.home,
        type: sourceInfo.type,
        interval: sourceInfo.interval,
      },
      data: limitedItems,
      count: limitedItems.length,
      total: items.length,
      cached: !force, // 如果不是强制刷新，可能来自缓存（待实现）
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch source data',
      data: {
        sourceId: id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
