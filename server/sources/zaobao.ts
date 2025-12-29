import * as cheerio from "cheerio";
import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";
import { parseRelativeDate } from "~/server/utils/date";

export default defineSource(async () => {
  try {
    const baseURL = "https://www.zaobao.com";
    const html: string = await myFetch("https://www.zaobao.com/realtime/china", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Referer: "https://www.zaobao.com/",
      },
    });

    const $ = cheerio.load(html);
    const news: NewsItem[] = [];

    // 解析文章列表
    $("article").each((_, el) => {
      const $article = $(el);

      // 获取文章链接和标题
      const linkElement = $article.find(".article-link");
      const title = linkElement.text().trim();
      const href = linkElement.attr("href");

      if (!href || !title) return;

      // 构建完整 URL
      const fullUrl = href.startsWith("http") ? href : baseURL + href;

      // 获取文章 ID (从 URL 中提取)
      const storyIdMatch = href.match(/story(\d+-\d+)/);
      const id = storyIdMatch ? storyIdMatch[1] : href;

      // 获取时间信息
      let pubDate: number | undefined;

      // 尝试从 datetime 属性获取
      const datetime = $article.find("time[datetime]").attr("datetime");
      if (datetime) {
        try {
          pubDate = new Date(datetime).getTime();
        } catch (e) {
          // 继续使用相对时间
        }
      }

      // 如果没有 datetime，尝试从文本中提取相对时间
      if (!pubDate) {
        const timeText = $article.find("time").text().trim() ||
                        $article.text().match(/(\d+分钟前|\d+小时前|\d+天前)/)?.[0];

        if (timeText && timeText !== "刚刚") {
          try {
            pubDate = parseRelativeDate(timeText, "Asia/Shanghai").valueOf();
          } catch (e) {
            pubDate = new Date().getTime();
          }
        }
      }

      news.push({
        id,
        title,
        url: fullUrl,
        source: "zaobao",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(pubDate ? { pubDate } : {}),
      });
    });

    return news.slice(0, 20);
  } catch (error) {
    logger.error("早报热搜获取失败:", error);
    return [];
  }
});
