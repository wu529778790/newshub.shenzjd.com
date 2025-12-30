import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { XMLParser } from "fast-xml-parser";

export default defineSource(async () => {
  const xml = await myFetch("https://feeds.bbci.co.uk/news/rss.xml");
  const parser = new XMLParser({ ignoreAttributes: false });
  const feed = parser.parse(xml);

  const items = feed.rss.channel.item.slice(0, 10);

  return items.map((item) => ({
    id: item.guid,
    title: item.title,
    url: item.link,
    pubDate: item.pubDate,
    extra: {
      description: item.description?.substring(0, 50) + "...",
    },
  }));
});
