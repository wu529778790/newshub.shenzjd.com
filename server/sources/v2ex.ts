import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface V2EXResponse {
  id: number;
  title: string;
  url: string;
  username: string;
  replies: number;
  created: number;
  node: {
    name: string;
    title: string;
  };
}

export default defineSource({
  "v2ex-share": async () => {
    try {
      // V2EX 最新分享
      const url = "https://www.v2ex.com/api/topics/show.json?node_name=share";

      const res: V2EXResponse[] = await myFetch(url, {
        headers: {
          Referer: "https://www.v2ex.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!Array.isArray(res)) {
        throw new Error("V2EX API 返回数据格式异常");
      }

      return res
        .slice(0, 20)
        .map((item, index) => ({
          id: item.id,
          title: item.title,
          url: `https://www.v2ex.com/t/${item.id}`,
          extra: {
            info: `${item.node.title} | 💬 ${item.replies}`,
            rank: index + 1,
          },
        }));
    } catch (error) {
      logger.error("V2EX 分享获取失败:", error);
      return [];
    }
  },
});
