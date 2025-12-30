import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { load } from "cheerio";

export default defineSource(async () => {
  const html = await myFetch("https://finance.eastmoney.com/a/cjswx.html");
  const $ = load(html);
  const news: NewsItem[] = [];

  // 解析 h1, h2, a 标签
  $(".linksi h1 a, .linksi h2 a, .linksi a").each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    const url = $el.attr("href");

    if (url && title && news.length < 10) {
      news.push({
        id: url,
        title,
        url,
      });
    }
  });

  return news;
});
