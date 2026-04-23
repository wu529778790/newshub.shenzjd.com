import { getHotList } from "~/server/services/hot-list.service";
import { sourcesMap } from "~/server/services/sources";
import { getCacheTable } from "~/server/database/cache";
import { sourceRegistry } from "~/server/utils/source-registry";

export default defineEventHandler(async (event) => {
  // 从路径参数获取 source ID
  const sourceId = getRouterParam(event, 'source');
  const requestStartedAt = Date.now();

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing source ID in URL path",
    });
  }

  // 检查查询参数（支持 force 刷新）
  const query = getQuery(event);
  const forceRefresh = query.force === "1" || query.force === "true";

  // 验证数据源是否存在
  if (!sourcesMap.has(sourceId)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Source not found",
      data: {
        sourceId,
        availableSources: Array.from(sourcesMap.keys()),
      },
    });
  }

  const cacheTable = await getCacheTable();
  const now = Date.now();

  // 🔥 优化1: 快速缓存检查（内存优先，文件次之）
  if (!forceRefresh && cacheTable) {
    const cache = await cacheTable.get(sourceId);
    if (cache) {
      const age = now - cache.updated;
      // 缓存时间根据数据是否为空而不同
      // 有数据：缓存1小时
      // 空数据：缓存1分钟（避免重复抓取）
      const cacheDuration = cache.items?.length > 0 ? 3600000 : 60000;

      if (age < cacheDuration) {
        // 记录缓存命中率
        const config = sourceRegistry.get(sourceId);
        if (config) {
          sourceRegistry.recordMetrics(sourceId, 0, true);
        }

        // 返回带缓存标识的数据
        return {
          success: true,
          sourceId,
          cached: true,
          timestamp: cache.updated,
          count: cache.items.length,
          data: cache.items,
        };
      }
    }
  }

  // 🔥 优化2: 错误快速返回 + 超时保护
  try {
    // 添加随机延迟，避免同时请求多个源导致被限流
    const randomDelay = Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    // 使用 Promise.race 添加超时保护
    const items = await Promise.race([
      getHotList(sourceId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), 15000)
      )
    ]) as any[];

    // 🔥 优化3: 异步保存缓存，不阻塞响应
    if (cacheTable) {
      cacheTable.set(sourceId, items).catch(err => {
        console.error('缓存保存失败:', err);
      });
    }

    // 记录成功指标
    const config = sourceRegistry.get(sourceId);
    if (config) {
      sourceRegistry.recordMetrics(sourceId, Date.now() - requestStartedAt, true);
    }

    // 返回成功响应
    return {
      success: true,
      sourceId,
      cached: false,
      timestamp: now,
      count: items.length,
      data: items,
    };
  } catch (error) {
    console.error(`获取 ${sourceId} 数据失败:`, error);

    // 🔥 优化4: 失败时返回空数组，避免前端长时间等待
    // 同时记录失败指标
    const config = sourceRegistry.get(sourceId);
    if (config) {
      sourceRegistry.recordMetrics(
        sourceId,
        Date.now() - requestStartedAt,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // 返回错误响应（但不抛出，让前端能处理）
    return {
      success: false,
      sourceId,
      cached: false,
      timestamp: now,
      count: 0,
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
