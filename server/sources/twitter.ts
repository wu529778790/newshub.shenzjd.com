import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface TwitterTrendsResponse {
  data: Array<{
    name: string;
    url: string;
    tweet_volume?: number;
  }>;
}

export default defineSource({
  twitter: async () => {
    try {
      // 使用 RSSHub 获取 Twitter 热搜
      // RSSHub 路由: /twitter/trends/:woeid?
      // 默认 WOEID=1 (全球)
      const rsshubUrl = "https://rsshub.rssforever.com/twitter/trends/1";

      const data: any = await myFetch(rsshubUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!data?.items) {
        throw new Error("Twitter 趋势数据格式异常");
      }

      return data.items
        .slice(0, 20)
        .map((item: any, index: number) => ({
          id: item.link || `twitter_${index}`,
          title: item.title,
          url: item.link,
          extra: {
            info: item.pubDate ? new Date(item.pubDate).toLocaleTimeString() : "",
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("Twitter 趋势获取失败:", error);
      return [];
    }
  },

  // Twitter 热门推文（使用 RSSHub）
  "twitter-tweet": async () => {
    try {
      // 获取 Twitter 热门推文
      const rsshubUrl = "https://rsshub.rssforever.com/twitter/trends/1";

      const data: any = await myFetch(rsshubUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!data?.items) {
        throw new Error("Twitter 推文数据格式异常");
      }

      return data.items
        .slice(0, 20)
        .map((item: any, index: number) => ({
          id: item.id || item.link || `twitter_tweet_${index}`,
          title: item.title,
          url: item.link,
          extra: {
            info: item.pubDate ? new Date(item.pubDate).toLocaleTimeString() : "",
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("Twitter 推文获取失败:", error);
      return [];
    }
  },
});
