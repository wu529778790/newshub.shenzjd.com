import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface WeiboResponse {
  ok: number;
  data: {
    realtime: Array<{
      word_scheme: string;
      num: number;
      topic_flag: number;
      icon_desc?: string;
      icon?: string;
    }>;
  };
}

export default defineSource({
  weibo: async () => {
    try {
      // 使用微博新的 AJAX 接口
      const url = "https://weibo.com/ajax/side/hotSearch";

      const res: WeiboResponse = await myFetch(url, {
        headers: {
          Referer: "https://weibo.com/",
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      });

      if (!res.data?.realtime) {
        throw new Error("微博API返回数据格式异常");
      }

      return res.data.realtime
        .filter((item) => item.word_scheme && item.num > 0)
        .slice(0, 20)
        .map((item, index) => ({
          id: item.word_scheme,
          title: item.word_scheme,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word_scheme)}`,
          extra: {
            info: `热度: ${item.num.toLocaleString()}`,
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("微博热搜获取失败:", error);
      // 返回空数组而不是抛出错误，避免影响其他数据源
      return [];
    }
  },
});
