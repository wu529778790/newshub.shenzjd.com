import { getHotList } from "~/server/services/hot-list.service";
import { sourcesMap } from "~/server/services/sources";
import { getCacheTable } from "~/server/database/cache";
import { sourceRegistry } from "~/server/utils/source-registry";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id as string;
  const forceRefresh = query.refresh === "true";

  if (!id || !sourcesMap.has(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid source id",
    });
  }

  const cacheTable = await getCacheTable();
  const now = Date.now();

  // 🔥 优化1: 快速缓存检查（不等待异步操作）
  if (!forceRefresh && cacheTable) {
    const cache = await cacheTable.get(id);
    if (cache) {
      const age = now - cache.updated;
      // 缓存时间根据数据是否为空而不同
      // 有数据：缓存1小时
      // 空数据：缓存1分钟（避免重复抓取）
      const cacheDuration = cache.items?.length > 0 ? 3600000 : 60000;

      if (age < cacheDuration) {
        // 🔥 优化2: 记录缓存命中率
        const config = sourceRegistry.get(id);
        if (config) {
          sourceRegistry.recordMetrics(id, 0, true);
        }
        return cache.items;
      }
    }
  }

  // 🔥 优化3: 并行处理 + 错误快速返回
  try {
    // 添加随机延迟，避免同时请求多个源导致被限流
    const randomDelay = Math.random() * 300; // 减少到300ms
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    // 🔥 优化4: 使用 Promise.race 添加超时保护
    const items = await Promise.race([
      getHotList(id),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), 15000)
      )
    ]) as any[];

    // 异步保存缓存，不阻塞响应
    if (cacheTable) {
      cacheTable.set(id, items).catch(err => {
        console.error('缓存保存失败:', err);
      });
    }

    return items;
  } catch (error) {
    console.error(`获取 ${id} 数据失败:`, error);

    // 失败时返回空数组，避免前端长时间等待
    return [];
  }
});
