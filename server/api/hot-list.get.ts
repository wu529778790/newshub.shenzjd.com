import { getHotList } from "~/server/services/hot-list.service";
import { sourcesMap } from "~/server/services/sources";
import { getCacheTable } from "~/server/database/cache";

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

  // 如果不是强制刷新，则检查缓存
  if (!forceRefresh && cacheTable) {
    const cache = await cacheTable.get(id);
    if (cache) {
      const age = now - cache.updated;
      // 缓存时间根据数据是否为空而不同
      // 有数据：缓存1小时
      // 空数据：缓存1分钟（避免重复抓取）
      const cacheDuration = cache.items?.length > 0 ? 3600000 : 60000;

      if (age < cacheDuration) {
        return cache.items;
      }
    }
  }

  // 添加随机延迟，避免同时请求多个源导致被限流
  const randomDelay = Math.random() * 500; // 0-500ms
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  const items = await getHotList(id);

  if (cacheTable) {
    // 即使是空数据也缓存，但时间较短
    await cacheTable.set(id, items);
  }

  return items;
});
