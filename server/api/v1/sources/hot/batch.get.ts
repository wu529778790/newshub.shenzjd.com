/**
 * GET /api/v1/sources/hot/batch
 * 批量获取热点数据
 */

import { z } from 'zod';
import { sourceManager } from '~/server/services/source-manager';
import { PriorityTaskQueue } from '~/server/utils/concurrency';

const querySchema = z.object({
  ids: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  concurrency: z.coerce.number().min(1).max(10).default(5),
  timeout: z.coerce.number().min(1000).max(60000).default(30000),
});

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const parsed = querySchema.safeParse(query);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid parameters',
      data: parsed.error.issues,
    });
  }

  const { ids, limit, concurrency, timeout } = parsed.data;
  const sourceIds = ids.split(',').map(s => s.trim()).filter(Boolean);

  if (sourceIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No source IDs provided',
    });
  }

  // 创建优先级队列
  const queue = new PriorityTaskQueue(concurrency);

  // 超时保护
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Batch request timeout (${timeout}ms)`)), timeout);
  });

  // 添加任务
  const tasks = sourceIds.map(id =>
    queue.add(async () => {
      try {
        const items = await sourceManager.getHotList(id, { force: false });
        return {
          id,
          success: true,
          items: items.slice(0, limit),
          count: items.length,
        };
      } catch (error) {
        return {
          id,
          success: false,
          error: (error as Error).message,
          items: [],
          count: 0,
        };
      }
    }, 100) // 高优先级
  );

  // 等待结果或超时
  try {
    const results = await Promise.race([
      Promise.all(tasks),
      timeoutPromise,
    ]);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      data: Object.fromEntries(results.map(r => [r.id, r])),
      meta: {
        total: sourceIds.length,
        success: successful.length,
        failed: failed.length,
        avgResponseTime: Math.round(
          results.reduce((sum, r) => sum + (r.count > 0 ? 100 : 0), 0) / results.length
        ) + 'ms',
      },
    };
  } catch (error) {
    throw createError({
      statusCode: 504,
      statusMessage: 'Request timeout',
      data: {
        timeout,
        message: (error as Error).message,
      },
    });
  }
});
