import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { load } from "cheerio";

export default defineSource(async () => {
  const html = await myFetch("https://www.v2ex.com/?tab=hot");
  const $ = load(html);
  const news: NewsItem[] = [];

  // V2EX 热门帖子结构
  $(".cell .item_title a").each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    const url = $el.attr("href");

    if (url && title && news.length < 10) {
      news.push({
        id: `v2ex-${url}`,
        title,
        url: url.startsWith("http") ? url : `https://www.v2ex.com${url}`,
      });
    }
  });

  return news;
});
