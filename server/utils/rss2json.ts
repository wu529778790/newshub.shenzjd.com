import { XMLParser } from "fast-xml-parser";
import { myFetch } from "~/server/utils/fetch";
import { logger } from "~/server/utils/logger";
import type { RSSInfo } from "../types";

export async function rss2json(url: string): Promise<RSSInfo | undefined> {
  if (!/^https?:\/\/[^\s$.?#].\S*/i.test(url)) return;

  const data = await myFetch(url);

  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "$text",
    ignoreAttributes: false,
  });

  const result = xml.parse(data as string);

  let channel =
    result.rss && result.rss.channel ? result.rss.channel : result.feed;
  if (Array.isArray(channel)) channel = channel[0];

  if (!channel) {
    logger.error("Invalid RSS feed format:", result);
    return;
  }

  const rss: RSSInfo = {
    title: channel.title ?? "",
    description: channel.description ?? "",
    link: channel.link && channel.link.href ? channel.link.href : channel.link,
    image: channel.image
      ? channel.image.url
      : channel["itunes:image"]
      ? channel["itunes:image"].href
      : "",
    updatedTime: channel.lastBuildDate ?? channel.updated,
    items: [],
  };

  let items = channel.item || channel.entry || [];
  if (items && !Array.isArray(items)) items = [items];

  for (let i = 0; i < items.length; i++) {
    const val = items[i];
    const media = {};

    const obj: Record<string, any> = {
      id: val.guid && val.guid.$text ? val.guid.$text : val.id,
      title:
        val.title && typeof val.title === "object" && val.title.$text
          ? val.title.$text
          : val.title,
      description:
        val.summary && val.summary.$text ? val.summary.$text : val.description,
      link: val.link && val.link.href ? val.link.href : val.link,
      author:
        val.author && val.author.name ? val.author.name : val["dc:creator"],
      created: val.updated ?? val.pubDate ?? val.created,
      category: val.category || [],
      content:
        val.content && val.content.$text
          ? val.content.$text
          : val["content:encoded"],
      enclosures: val.enclosure
        ? Array.isArray(val.enclosure)
          ? val.enclosure
          : [val.enclosure]
        : [],
    };

    [
      "content:encoded",
      "podcast:transcript",
      "itunes:summary",
      "itunes:author",
      "itunes:explicit",
      "itunes:duration",
      "itunes:season",
      "itunes:episode",
      "itunes:episodeType",
      "itunes:image",
    ].forEach((s) => {
      const namespacedValue = (val as Record<string, unknown>)[s];
      if (namespacedValue) {
        obj[s.replace(":", "_")] = namespacedValue;
      }
    });

    if (val["media:thumbnail"]) {
      Object.assign(media, { thumbnail: val["media:thumbnail"] });
      obj.enclosures.push(val["media:thumbnail"]);
    }

    if (val["media:content"]) {
      Object.assign(media, { thumbnail: val["media:content"] });
      obj.enclosures.push(val["media:content"]);
    }

    if (val["media:group"]) {
      if (val["media:group"]["media:title"])
        obj.title = val["media:group"]["media:title"];

      if (val["media:group"]["media:description"])
        obj.description = val["media:group"]["media:description"];

      if (val["media:group"]["media:thumbnail"])
        obj.enclosures.push(val["media:group"]["media:thumbnail"].url);

      if (val["media:group"]["media:content"])
        obj.enclosures.push(val["media:group"]["media:content"]);
    }

    Object.assign(obj, { media });

    rss.items.push(obj as any);
  }

  return rss;
}
