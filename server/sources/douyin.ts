import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";

interface Res {
  data: {
    word_list: {
      sentence_id: string;
      word: string;
      event_time: string;
      hot_value: string;
    }[];
  };
}

export default defineSource({
  douyin: async () => {
    try {
      const url =
        "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1";

      // 获取 Cookie
      const cookieRes = await myFetch.raw(
        "https://www.douyin.com/passport/general/login_guiding_strategy/?aid=6383"
      );
      const cookies = cookieRes.headers.getSetCookie();

      const res: Res = await myFetch(url, {
        headers: {
          cookie: cookies.length > 0 ? cookies.join("; ") : "",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Referer: "https://www.douyin.com/",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Origin: "https://www.douyin.com",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      });

      if (!res.data?.word_list) {
        throw new Error("抖音API返回数据格式异常");
      }

      return res.data.word_list.map((k) => ({
        id: k.sentence_id,
        title: k.word,
        url: `https://www.douyin.com/hot/${k.sentence_id}`,
        extra: {
          info: `热度: ${k.hot_value}`,
          date: k.event_time,
        },
      }));
    } catch (error) {
      logger.error("抖音热搜获取失败:", error);
      // 返回空数组而不是抛出错误，避免影响其他数据源
      return [];
    }
  },
});
