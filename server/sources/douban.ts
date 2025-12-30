import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface DoubanMovieResponse {
  subject_collection_items: Array<{
    subject: {
      id: string;
      title: string;
      url: string;
      rating?: {
        value: number;
        count: number;
      };
      year?: string;
    };
  }>;
}

interface DoubanBookResponse {
  subject_collection_items: Array<{
    subject: {
      id: string;
      title: string;
      url: string;
      rating?: {
        value: number;
        count: number;
      };
      author?: string[];
    };
  }>;
}

export default defineSource({
  "douban-movie": async () => {
    try {
      // 豆瓣电影排行榜
      const url = "https://m.douban.com/rexxar/api/v2/subject_collection/movie_hot_gaia/items";

      const res: DoubanMovieResponse = await myFetch(url, {
        headers: {
          Referer: "https://m.douban.com/",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
          "X-Override-Referer": "https://movie.douban.com/",
        },
        params: {
          start: 0,
          count: 20,
        },
      });

      if (!res.subject_collection_items) {
        throw new Error("豆瓣API返回数据格式异常");
      }

      return res.subject_collection_items
        .slice(0, 10)
        .map((item, index) => {
          const subject = item.subject;
          const rating = subject.rating?.value ? `⭐${subject.rating.value}` : "";
          return {
            id: subject.id,
            title: `${subject.title} ${rating}`,
            url: subject.url,
            extra: {
              info: subject.year || "",
              rank: index + 1,
            },
          };
        });
    } catch (error) {
      logger.error("豆瓣电影获取失败:", error);
      return [];
    }
  },

  "douban-book": async () => {
    try {
      // 豆瓣图书热门榜
      const url = "https://m.douban.com/rexxar/api/v2/subject_collection/book_hot_ranking/items";

      const res: DoubanBookResponse = await myFetch(url, {
        headers: {
          Referer: "https://m.douban.com/",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        },
        params: {
          start: 0,
          count: 20,
        },
      });

      if (!res.subject_collection_items) {
        throw new Error("豆瓣API返回数据格式异常");
      }

      return res.subject_collection_items
        .slice(0, 10)
        .map((item, index) => {
          const subject = item.subject;
          const rating = subject.rating?.value ? `⭐${subject.rating.value}` : "";
          const author = subject.author?.[0] ? ` - ${subject.author[0]}` : "";
          return {
            id: subject.id,
            title: `${subject.title}${author} ${rating}`,
            url: subject.url,
            extra: {
              info: subject.rating?.count ? `评分: ${subject.rating.count}` : "",
              rank: index + 1,
            },
          };
        });
    } catch (error) {
      logger.error("豆瓣图书获取失败:", error);
      return [];
    }
  },

  "douban-music": async () => {
    try {
      // 豆瓣音乐新碟榜
      const url = "https://m.douban.com/rexxar/api/v2/subject_collection/music_latest/items";

      const res: any = await myFetch(url, {
        headers: {
          Referer: "https://m.douban.com/",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        },
        params: {
          start: 0,
          count: 20,
        },
      });

      if (!res.subject_collection_items) {
        throw new Error("豆瓣API返回数据格式异常");
      }

      return res.subject_collection_items
        .slice(0, 10)
        .map((item: any, index: number) => {
          const subject = item.subject;
          return {
            id: subject.id,
            title: `${subject.title} - ${subject.artist?.name || ""}`,
            url: subject.url,
            extra: {
              info: subject.year || "",
              rank: index + 1,
            },
          };
        });
    } catch (error) {
      logger.error("豆瓣音乐获取失败:", error);
      return [];
    }
  },
});
