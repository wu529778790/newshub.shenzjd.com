import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface GoogleTrendsResponse {
  default: {
    trendingSearchesDays: Array<{
      trendingSearches: Array<{
        title: {
          query: string;
        };
        shareUrl: string;
        image: {
          imageUrl: string;
        };
        formattedTraffic: string;
      }>;
    }>;
  };
}

export default defineSource({
  "google-trends": async () => {
    try {
      // Google Trends 每日热搜（美国）
      const url = "https://trends.google.com/trends/api/dailytrends";

      const res = await myFetch(url, {
        headers: {
          Referer: "https://trends.google.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        params: {
          hl: "en-US",
          tz: "-480",
          geo: "US",
          date: "today 7-d",
        },
        parseResponse: (responseText: string) => responseText,
      } as any);

      // Google Trends 返回的是 JSONP 格式，需要清理
      // 格式: )]}'\n{"default": {...}}
      const cleaned = res.replace(/^\)\]\}'\n/, "");
      const data: GoogleTrendsResponse = JSON.parse(cleaned);

      if (!data?.default?.trendingSearchesDays?.[0]?.trendingSearches) {
        throw new Error("Google Trends 数据格式异常");
      }

      const trendingSearches = data.default.trendingSearchesDays[0].trendingSearches;

      return trendingSearches
        .slice(0, 20)
        .map((item, index) => ({
          id: item.title.query,
          title: item.title.query,
          url: item.shareUrl,
          extra: {
            info: item.formattedTraffic || "",
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("Google Trends 获取失败:", error);
      return [];
    }
  },

  // Google Trends - 24小时热搜
  "google-trends-24h": async () => {
    try {
      const url = "https://trends.google.com/trends/api/dailytrends";

      const res = await myFetch(url, {
        headers: {
          Referer: "https://trends.google.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        params: {
          hl: "en-US",
          tz: "-480",
          geo: "US",
          date: "today 1-d",
        },
        parseResponse: (responseText: string) => responseText,
      } as any);

      const cleaned = res.replace(/^\)\]\}'\n/, "");
      const data: GoogleTrendsResponse = JSON.parse(cleaned);

      if (!data?.default?.trendingSearchesDays?.[0]?.trendingSearches) {
        throw new Error("Google Trends 数据格式异常");
      }

      const trendingSearches = data.default.trendingSearchesDays[0].trendingSearches;

      return trendingSearches
        .slice(0, 20)
        .map((item, index) => ({
          id: item.title.query,
          title: item.title.query,
          url: item.shareUrl,
          extra: {
            info: item.formattedTraffic || "",
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("Google Trends 24h 获取失败:", error);
      return [];
    }
  },
});
