import type { NewsItem } from "@shared/types";
import { myFetch } from "~/server/utils/fetch";
import { proxyPicture } from "~/server/utils/proxy";

interface Res {
  data: {
    ClusterIdStr: string;
    Title: string;
    HotValue: string;
    Image: {
      url: string;
    };
    LabelUri?: {
      url: string;
    };
  }[];
}

export default defineSource(async () => {
  const url = "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc";
  const res: Res = await myFetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Referer: "https://www.toutiao.com/",
    },
  });
  return res.data.map((k) => {
    return {
      id: k.ClusterIdStr,
      title: k.Title,
      url: `https://www.toutiao.com/trending/${k.ClusterIdStr}/`,
      extra: {
        info: `热度: ${k.HotValue}`,
        icon: k.LabelUri?.url && proxyPicture(k.LabelUri.url, "encodeBase64URL"),
      },
    };
  });
});
