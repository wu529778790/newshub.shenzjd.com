import * as cheerio from "cheerio";
import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";
import { parseRelativeDate } from "~/server/utils/date";

export default defineSource(async () => {
  try {
    const baseURL = "https://www.gelonghui.com";
    const html: string = await myFetch("https://www.gelonghui.com/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Referer: "https://www.gelonghui.com/",
      },
    });

    const $ = cheerio.load(html);
    const news: NewsItem[] = [];

    // 解析文章列表
    $(".article-li").each((_, el) => {
      const $el = $(el);

      // 获取文章链接和标题
      const linkElement = $el.find(".detail-right a h2");
      const title = linkElement.text().trim();
      const url = linkElement.parent().attr("href");

      if (!url || !title) return;

      // 获取完整 URL
      const fullUrl = url.startsWith("http") ? url : baseURL + url;

      // 获取摘要
      const summary = $el.find(".detail-right summary").text().trim();

      // 获取时间和来源
      const sourceTime = $el.find(".source-time");
      const timeText = sourceTime.find("span").last().text().trim();

      // 获取图片（如果有）
      const imgElement = $el.find(".detail-left img");
      const imgSrc = imgElement.attr("data-src") || imgElement.attr("src");

      // 解析相对时间
      let pubDate: number | undefined;
      if (timeText && timeText !== "刚刚") {
        try {
          pubDate = parseRelativeDate(timeText, "Asia/Shanghai").valueOf();
        } catch (e) {
          pubDate = new Date().getTime();
        }
      }

      news.push({
        id: url.replace(/[^a-zA-Z0-9]/g, ""),
        title,
        url: fullUrl,
        extra: {
          info: summary || undefined,
          date: pubDate,
          image: imgSrc && imgSrc !== "/images/default-image.jpg" ? imgSrc : undefined,
        },
      });
    });

    return news.slice(0, 20);
  } catch (error) {
    logger.error("格隆汇热搜获取失败:", error);
    return [];
  }
});
