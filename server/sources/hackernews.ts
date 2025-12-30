import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";

export default defineSource(async () => {
  // 1. 获取 Top 20 故事 ID
  const topIds: number[] = await myFetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );

  // 2. 并行获取前 10 个故事详情
  const items = await Promise.all(
    topIds.slice(0, 10).map((id) =>
      myFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    )
  );

  // 3. 转换为 NewsItem
  return items.map((item) => ({
    id: item.id.toString(),
    title: item.title,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    extra: {
      info: `👍 ${item.score} | 💬 ${item.descendants || 0}`,
    },
  }));
});
