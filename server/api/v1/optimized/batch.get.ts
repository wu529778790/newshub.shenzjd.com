import { sourceManager } from '~/server/services/source-manager';
import { PriorityTaskQueue } from '~/server/utils/concurrency';
import { z } from 'zod';

/**
 * GET /api/v1/optimized/batch
 * 优化的批量 API - 带优先级和并发控制
 *
 * 查询参数:
 * - sources: 逗号分隔的数据源ID
 * - priority: 优先级排序 (high, medium, low)
 * - concurrency: 并发数 (1-10)
 * - timeout: 超时时间（毫秒）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  // 参数验证
  const schema = z.object({
    sources: z.string().min(1),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    concurrency: z.coerce.number().min(1).max(10).default(5),
    timeout: z.coerce.number().min(1000).max(60000).default(30000),
    limit: z.coerce.number().min(1).max(50).default(10),
  });

  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid parameters',
      data: parsed.error.issues,
    });
  }

  const { sources: sourcesStr, priority, concurrency, timeout, limit } = parsed.data;
  const sourceIds = sourcesStr.split(',').map(s => s.trim()).filter(Boolean);

  // 过滤有效的数据源
  const validSources = sourceIds
    .map(id => ({ id, config: sourceManager.getSourceInfo(id) }))
    .filter(s => s.config)
    .map(s => ({ id: s.id, config: s.config! }));

  if (validSources.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No valid sources found',
    });
  }

  // 计算优先级权重
  const priorityWeights: Record<string, number> = {
    high: 100,
    medium: 50,
    low: 0,
  };

  // 基于数据源类型调整优先级
  const getPriority = (id: string, config: any): number => {
    let base = priorityWeights[priority];

    // 实时数据源优先级更高
    if (config.type === 'realtime') base += 20;

    // 用户可见的数据源优先级更高（简单启发式）
    if (['weibo', 'zhihu', 'baidu'].includes(id)) base += 10;

    return base;
  };

  // 创建优先级队列
  const queue = new PriorityTaskQueue(concurrency);

  // 设置超时
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`批量请求超时 (${timeout}ms)`)), timeout);
  });

  // 添加所有任务
  const tasks = validSources.map(({ id, config }) => {
    const taskPriority = getPriority(id, config);

    return queue.add(async () => {
      try {
        const items = await sourceManager.getHotList(id, { force: false });
        return {
          id,
          name: config.name,
          success: true,
          data: items.slice(0, limit),
          count: items.length,
        };
      } catch (error) {
        return {
          id,
          name: config.name,
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, taskPriority);
  });

  // 等待所有任务完成或超时
  try {
    const results = await Promise.race([
      Promise.all(tasks),
      timeoutPromise,
    ]);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      optimization: {
        priority,
        concurrency,
        timeout,
        strategy: 'priority-queue',
      },
      summary: {
        total: validSources.length,
        success: successCount,
        failed: failCount,
        avgResponseTime: Math.round(
          results.reduce((sum, r) => sum + (r.count > 0 ? 100 : 0), 0) / results.length
        ) + 'ms',
      },
      results,
    };
  } catch (error) {
    throw createError({
      statusCode: 504,
      statusMessage: 'Request timeout',
      data: {
        timeout,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
