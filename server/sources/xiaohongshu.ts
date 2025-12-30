import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface XiaohongshuResponse {
  data: {
    items: Array<{
      note_card: {
        title: string;
        note_id: string;
        interact_info: {
          liked_count: number;
          comment_count: number;
        };
        user: {
          nickname: string;
        };
      };
    }>;
  };
}

export default defineSource({
  xiaohongshu: async () => {
    try {
      // 小红书热门笔记接口
      const url = "https://www.xiaohongshu.com/api/sns/v1/note/search/notes";

      const res: XiaohongshuResponse = await myFetch(url, {
        headers: {
          Referer: "https://www.xiaohongshu.com/",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
          "x-s": "xxx", // 可能需要签名
          "x-t": "xxx",
        },
        params: {
          keyword: "热门",
          search_key: "hot",
          page: 1,
          page_size: 20,
        },
      });

      if (!res.data?.items) {
        throw new Error("小红书API返回数据格式异常");
      }

      return res.data.items
        .slice(0, 20)
        .map((item, index) => {
          const note = item.note_card;
          return {
            id: note.note_id,
            title: note.title || "无标题",
            url: `https://www.xiaohongshu.com/explore/${note.note_id}`,
            extra: {
              info: `❤️ ${note.interact_info.liked_count} | 💬 ${note.interact_info.comment_count}`,
              rank: index + 1,
            },
          };
        });
    } catch (error) {
      logger.error("小红书热门获取失败:", error);
      return [];
    }
  },
});
