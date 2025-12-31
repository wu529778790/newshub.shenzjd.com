import process from "node:process";
import { Interval } from "./consts";
import { typeSafeObjectFromEntries } from "./type.util";
import type { OriginSource, Source, SourceID } from "./types";

const Time = {
  Test: 1,
  Realtime: 2 * 60 * 1000,
  Fast: 5 * 60 * 1000,
  Default: Interval, // 10min
  Common: 30 * 60 * 1000,
  Slow: 60 * 60 * 1000,
};

export const originSources = {
  zhihu: {
    name: "知乎",
    type: "hottest",
    column: "china",
    color: "blue",
    home: "https://www.zhihu.com",
    icon: "💭",
  },
  weibo: {
    name: "微博",
    title: "实时热搜",
    type: "hottest",
    column: "china",
    color: "red",
    interval: Time.Realtime,
    home: "https://weibo.com",
    icon: "🌐",
  },
  coolapk: {
    name: "酷安",
    type: "hottest",
    column: "tech",
    color: "green",
    title: "今日最热",
    home: "https://coolapk.com",
    icon: "📱",
  },

  wallstreetcn: {
    name: "华尔街见闻",
    color: "blue",
    column: "finance",
    home: "https://wallstreetcn.com/",
    icon: "💰",
    sub: {
      news: {
        title: "最新",
        interval: Time.Common,
      },
      hot: {
        title: "最热",
        type: "hottest",
        interval: Time.Common,
      },
    },
  },
  "36kr": {
    name: "36氪",
    type: "realtime",
    color: "blue",
    // cloudflare pages cannot access
    disable: "cf",
    home: "https://36kr.com",
    column: "tech",
    icon: "🚀",
    sub: {
      quick: {
        title: "快讯",
      },
    },
  },
  douyin: {
    name: "抖音",
    type: "hottest",
    column: "china",
    color: "gray",
    home: "https://www.douyin.com",
    icon: "🎵",
  },
  hupu: {
    name: "虎扑",
    home: "https://hupu.com",
    column: "china",
    title: "主干道热帖",
    type: "hottest",
    color: "red",
    icon: "🏀",
  },
  tieba: {
    name: "百度贴吧",
    title: "热议",
    column: "china",
    type: "hottest",
    color: "blue",
    home: "https://tieba.baidu.com",
    icon: "💬",
  },
  toutiao: {
    name: "今日头条",
    type: "hottest",
    column: "china",
    color: "red",
    home: "https://www.toutiao.com",
    icon: "📰",
  },
  ithome: {
    name: "IT之家",
    color: "red",
    column: "tech",
    type: "realtime",
    home: "https://www.ithome.com",
    icon: "💻",
  },
  thepaper: {
    name: "澎湃新闻",
    interval: Time.Common,
    type: "hottest",
    column: "china",
    title: "热榜",
    color: "gray",
    home: "https://www.thepaper.cn",
    icon: "🗞️",
  },
  sputniknewscn: {
    name: "卫星通讯社",
    color: "orange",
    column: "world",
    home: "https://sputniknews.cn",
    icon: "📡",
  },
  cankaoxiaoxi: {
    name: "参考消息",
    color: "red",
    column: "world",
    interval: Time.Common,
    home: "https://china.cankaoxiaoxi.com",
    icon: "📋",
  },
  pcbeta: {
    name: "远景论坛",
    color: "blue",
    column: "tech",
    home: "https://bbs.pcbeta.com",
    icon: "🖥️",
    sub: {
      windows11: {
        title: "Win11",
        type: "realtime",
        interval: Time.Fast,
      },
    },
  },

  xueqiu: {
    name: "雪球",
    color: "blue",
    home: "https://xueqiu.com",
    column: "finance",
    icon: "📈",
    sub: {
      hotstock: {
        title: "热门股票",
        interval: Time.Realtime,
        type: "hottest",
      },
    },
  },
  gelonghui: {
    name: "格隆汇",
    color: "blue",
    title: "事件",
    column: "finance",
    type: "realtime",
    interval: Time.Realtime,
    home: "https://www.gelonghui.com",
    icon: "📊",
  },
  fastbull: {
    name: "法布财经",
    color: "emerald",
    home: "https://www.fastbull.cn",
    column: "finance",
    icon: "💹",
    sub: {
      news: {
        title: "头条",
        interval: Time.Common,
      },
    },
  },
  solidot: {
    name: "Solidot",
    color: "teal",
    column: "tech",
    home: "https://solidot.org",
    interval: Time.Slow,
    icon: "🐧",
  },

  github: {
    name: "Github",
    color: "gray",
    home: "https://github.com/",
    column: "tech",
    icon: "🐙",
    sub: {
      "trending-today": {
        title: "Today",
        type: "hottest",
      },
    },
  },
  bilibili: {
    name: "哔哩哔哩",
    color: "blue",
    home: "https://www.bilibili.com",
    icon: "📺",
    sub: {
      "hot-search": {
        title: "热搜",
        column: "china",
        type: "hottest",
      },
      "hot-video": {
        title: "热门视频",
        disable: "cf",
        column: "china",
        type: "hottest",
      },
      ranking: {
        title: "排行榜",
        column: "china",
        disable: "cf",
        type: "hottest",
        interval: Time.Common,
      },
    },
  },
  kuaishou: {
    name: "快手",
    type: "hottest",
    column: "china",
    color: "orange",
    // cloudflare pages cannot access
    disable: "cf",
    home: "https://www.kuaishou.com",
    icon: "📹",
  },
  jin10: {
    name: "金十数据",
    column: "finance",
    color: "blue",
    type: "realtime",
    home: "https://www.jin10.com",
    icon: "⏱️",
  },
  baidu: {
    name: "百度热搜",
    column: "china",
    color: "blue",
    type: "hottest",
    home: "https://www.baidu.com",
    icon: "🔍",
  },

  nowcoder: {
    name: "牛客",
    column: "china",
    color: "blue",
    type: "hottest",
    home: "https://www.nowcoder.com",
    icon: "🎓",
  },
  sspai: {
    name: "少数派",
    column: "tech",
    color: "red",
    type: "hottest",
    home: "https://sspai.com",
    icon: "📱",
  },
  juejin: {
    name: "稀土掘金",
    column: "tech",
    color: "blue",
    type: "hottest",
    home: "https://juejin.cn",
    icon: "⛏️",
  },
  ifeng: {
    name: "凤凰网",
    column: "china",
    color: "red",
    type: "hottest",
    title: "热点资讯",
    home: "https://www.ifeng.com",
    icon: "🦅",
  },

  // 新增数据源 - 第一优先级
  hackernews: {
    name: "Hacker News",
    type: "hottest",
    column: "tech",
    color: "orange",
    home: "https://news.ycombinator.com",
    interval: Time.Fast,
    icon: "⚡",
  },

  bbcnews: {
    name: "BBC News",
    type: "hottest",
    column: "world",
    color: "red",
    home: "https://www.bbc.com/news",
    interval: Time.Common,
    icon: "🇬🇧",
  },

  v2exnew: {
    name: "V2EX 热门",
    type: "hottest",
    column: "tech",
    color: "blue",
    home: "https://www.v2ex.com",
    interval: Time.Common,
    icon: "🔧",
  },
} as const satisfies Record<string, OriginSource>;

export function genSources() {
  const _: [SourceID, Source][] = [];

  Object.entries(originSources).forEach(([id, source]: [any, OriginSource]) => {
    const parent = {
      name: source.name,
      type: source.type,
      disable: source.disable,
      desc: source.desc,
      column: source.column,
      home: source.home,
      color: source.color ?? "primary",
      interval: source.interval ?? Time.Default,
      icon: source.icon,
    };
    if (source.sub && Object.keys(source.sub).length) {
      Object.entries(source.sub).forEach(([subId, subSource], i) => {
        if (i === 0) {
          _.push([
            id,
            {
              redirect: `${id}-${subId}`,
              ...parent,
              ...subSource,
            },
          ] as [any, Source]);
        }
        _.push([`${id}-${subId}`, { ...parent, ...subSource }] as [
          any,
          Source
        ]);
      });
    } else {
      _.push([
        id,
        {
          title: source.title,
          ...parent,
        },
      ]);
    }
  });

  return typeSafeObjectFromEntries(
    _.filter(([_, v]) => {
      if (v.disable === "cf" && process.env.CF_PAGES) {
        return false;
      } else if (v.disable === true) {
        return false;
      } else {
        return true;
      }
    })
  );
}
