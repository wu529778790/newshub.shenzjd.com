import { sourceManager } from '~/server/services/source-manager';
import { z } from 'zod';

/**
 * GET /api/v1/batch
 * 批量获取多个数据源的数据
 *
 * 查询参数:
 * - sources: 逗号分隔的数据源ID列表 (e.g., weibo,zhihu,baidu)
 * - force: 是否强制刷新
 * - limit: 每个数据源的条数限制
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  // 参数验证
  const schema = z.object({
    sources: z.string().min(1, 'sources parameter is required'),
    force: z.coerce.boolean().default(false),
    limit: z.coerce.number().min(1).max(50).default(20),
  });

  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: {
        message: 'sources parameter is required (comma-separated list)',
        example: '/api/v1/batch?sources=weibo,zhihu,baidu&limit=10',
        errors: parsed.error.issues,
      },
    });
  }

  const { sources: sourcesStr, force, limit } = parsed.data;
  const sourceIds = sourcesStr.split(',').map(s => s.trim()).filter(Boolean);

  if (sourceIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No valid source IDs provided',
    });
  }

  // 验证并过滤不存在的数据源
  const validSources = sourceIds.filter(id => sourceManager.getSourceInfo(id));
  const invalidSources = sourceIds.filter(id => !sourceManager.getSourceInfo(id));

  if (validSources.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No valid sources found',
      data: { invalidSources },
    });
  }

  // 批量获取数据（带并发控制）
  const results = await sourceManager.getHotLists(validSources, {
    force,
    concurrency: 5, // 最大并发数
  });

  // 格式化响应
  const formattedResults = validSources.map(id => {
    const result = results[id];
    const sourceInfo = sourceManager.getSourceInfo(id);

    return {
      id,
      name: sourceInfo?.name,
      success: result?.success ?? false,
      data: result?.success ? result.data.slice(0, limit) : [],
      count: result?.success ? result.data.length : 0,
      error: result?.error,
    };
  });

  const successCount = formattedResults.filter(r => r.success).length;
  const failCount = formattedResults.filter(r => !r.success).length;

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    summary: {
      total: validSources.length,
      success: successCount,
      failed: failCount,
      invalid: invalidSources.length,
    },
    invalidSources,
    results: formattedResults,
  };
});
