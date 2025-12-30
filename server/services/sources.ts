interface Source {
  id: string;
  name: string;
  home: string;
}

export const sources: Source[] = [
  {
    id: "weibo",
    name: "微博",
    home: "https://weibo.com",
  },
  {
    id: "zhihu",
    name: "知乎",
    home: "https://www.zhihu.com",
  },
  {
    id: "36kr",
    name: "36氪",
    home: "https://www.36kr.com",
  },
  {
    id: "baidu",
    name: "百度",
    home: "https://top.baidu.com",
  },
  {
    id: "bilibili-hot-search",
    name: "B站热搜",
    home: "https://www.bilibili.com",
  },
  {
    id: "bilibili-hot-video",
    name: "B站热门视频",
    home: "https://www.bilibili.com",
  },
  {
    id: "bilibili-ranking",
    name: "B站排行榜",
    home: "https://www.bilibili.com",
  },
  {
    id: "github",
    name: "GitHub",
    home: "https://github.com/trending",
  },
  {
    id: "ithome",
    name: "IT之家",
    home: "https://www.ithome.com",
  },
  {
    id: "cankaoxiaoxi",
    name: "参考消息",
    home: "http://www.cankaoxiaoxi.com/",
  },

  {
    id: "douyin",
    name: "抖音",
    home: "https://www.douyin.com",
  },
  {
    id: "fastbull",
    name: "FastBull",
    home: "https://www.fastbull.com",
  },

  {
    id: "fastbull-news",
    name: "FastBull新闻",
    home: "https://www.fastbull.com",
  },
  {
    id: "gelonghui",
    name: "格隆汇",
    home: "https://www.gelonghui.com",
  },

  {
    id: "hupu",
    name: "虎扑",
    home: "https://bbs.hupu.com",
  },
  {
    id: "ifeng",
    name: "凤凰网",
    home: "https://www.ifeng.com",
  },
  {
    id: "jin10",
    name: "金十数据",
    home: "https://www.jin10.com",
  },
  {
    id: "juejin",
    name: "稀土掘金",
    home: "https://juejin.cn",
  },
  {
    id: "kuaishou",
    name: "快手",
    home: "https://www.kuaishou.com",
  },

  {
    id: "nowcoder",
    name: "牛客网",
    home: "https://www.nowcoder.com",
  },
  {
    id: "pcbeta-windows11",
    name: "PC Beta (Win11)",
    home: "https://bbs.pcbeta.com",
  },

  {
    id: "solidot",
    name: "Solidot",
    home: "https://www.solidot.org",
  },
  {
    id: "sputniknewscn",
    name: "卫星通讯社",
    home: "https://sputniknews.cn",
  },
  {
    id: "sspai",
    name: "少数派",
    home: "https://sspai.com",
  },
  {
    id: "thepaper",
    name: "澎湃新闻",
    home: "https://www.thepaper.cn",
  },
  {
    id: "tieba",
    name: "贴吧",
    home: "https://tieba.baidu.com",
  },
  {
    id: "toutiao",
    name: "今日头条",
    home: "https://www.toutiao.com",
  },

  {
    id: "wallstreetcn",
    name: "华尔街见闻",
    home: "https://wallstreetcn.com",
  },

  {
    id: "wallstreetcn-news",
    name: "华尔街见闻-新闻",
    home: "https://wallstreetcn.com",
  },
  {
    id: "wallstreetcn-hot",
    name: "华尔街见闻-热门",
    home: "https://wallstreetcn.com",
  },
  {
    id: "xueqiu",
    name: "雪球",
    home: "https://xueqiu.com",
  },

  {
    id: "coolapk",
    name: "酷安",
    home: "https://www.coolapk.com",
  },

  {
    id: "bilibili",
    name: "哔哩哔哩",
    home: "https://www.bilibili.com",
  },
  {
    id: "bilibili-hot-search",
    name: "B站热搜",
    home: "https://www.bilibili.com",
  },
  {
    id: "bilibili-hot-video",
    name: "B站热门视频",
    home: "https://www.bilibili.com",
  },
  {
    id: "bilibili-ranking",
    name: "B站排行榜",
    home: "https://www.bilibili.com",
  },
  {
    id: "pcbeta",
    name: "远景论坛",
    home: "https://bbs.pcbeta.com",
  },
  {
    id: "pcbeta-windows11",
    name: "远景论坛 Win11",
    home: "https://bbs.pcbeta.com",
  },
  {
    id: "fastbull-news",
    name: "法布财经新闻",
    home: "https://www.fastbull.cn",
  },
  {
    id: "wallstreetcn-news",
    name: "华尔街见闻-新闻",
    home: "https://wallstreetcn.com",
  },
  {
    id: "wallstreetcn-hot",
    name: "华尔街见闻-热门",
    home: "https://wallstreetcn.com",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    home: "https://news.ycombinator.com",
  },
  {
    id: "bbcnews",
    name: "BBC News",
    home: "https://www.bbc.com/news",
  },
  {
    id: "v2exnew",
    name: "V2EX 热门",
    home: "https://www.v2ex.com",
  },
];

export const sourcesMap = new Map(sources.map((item) => [item.id, item]));
