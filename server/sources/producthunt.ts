import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { XMLParser } from "fast-xml-parser";

export default defineSource(async () => {
  const xml = await myFetch("https://www.producthunt.com/feed");

  // Atom feed with namespace handling
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
  });

  const feed = parser.parse(xml);

  // Handle both single entry and array
  let entries = feed.feed.entry;
  if (!Array.isArray(entries)) {
    entries = entries ? [entries] : [];
  }

  return entries.slice(0, 10).map((entry) => {
    // Handle link - can be object with href or string
    let url = '';
    if (entry.link && typeof entry.link === 'object') {
      url = entry.link.href || entry.link['@_href'] || '';
    } else if (typeof entry.link === 'string') {
      url = entry.link;
    }

    return {
      id: typeof entry.id === 'string' ? entry.id : (entry.id['#text'] || ''),
      title: typeof entry.title === 'string' ? entry.title : (entry.title['#text'] || ''),
      url: url,
      pubDate: entry.published || entry.updated,
      extra: {
        author: entry.author?.name || '',
      },
    };
  });
});
