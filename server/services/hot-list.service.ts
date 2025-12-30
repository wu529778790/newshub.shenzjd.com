/**
 * @deprecated 该文件已过时，请使用 ~/server/services/source-manager.ts
 * 保留此文件以确保向后兼容，将在未来版本中移除
 */

import getWeiboHotList from "~/server/sources/weibo";
import { getZhihuHotList } from "~/server/sources/zhihu";
import { get36krHotList } from "~/server/sources/_36kr";
import { getBaiduHotList } from "~/server/sources/baidu";
import {
  getBilibiliHotSearch,
  getBilibiliHotVideo,
  getBilibiliRanking,
} from "~/server/sources/bilibili";
import { getGithubHotList } from "~/server/sources/github";
import getIthomeHotList from "~/server/sources/ithome";
import getCankaoxiaoxiHotList from "~/server/sources/cankaoxiaoxi";

import getDouyinHotList from "~/server/sources/douyin";
import getFastbullHotList from "~/server/sources/fastbull";
import getGelonghuiHotList from "~/server/sources/gelonghui";

import getHupuHotList from "~/server/sources/hupu";
import getIfengHotList from "~/server/sources/ifeng";
import getJin10HotList from "~/server/sources/jin10";
import getJuejinHotList from "~/server/sources/juejin";

import getKuaishouHotList from "~/server/sources/kuaishou";

import getNowcoderHotList from "~/server/sources/nowcoder";
import getPcbetaHotList from "~/server/sources/pcbeta";

import getSolidotHotList from "~/server/sources/solidot";
import getSputniknewscnHotList from "~/server/sources/sputniknewscn";
import getSspaiHotList from "~/server/sources/sspai";
import getThepaperHotList from "~/server/sources/thepaper";
import getTiebaHotList from "~/server/sources/tieba";
import getToutiaoHotList from "~/server/sources/toutiao";

import getWallstreetcnHotList from "~/server/sources/wallstreetcn";
import getXueqiuHotList from "~/server/sources/xueqiu";

import getCoolapkHotList from "~/server/sources/coolapk";
import type { NewsItem } from "@shared/types";
import { migrateFromOldService } from "./source-initializer";

// 新增数据源导入
import getHackerNewsList from "~/server/sources/hackernews";
import getProductHuntList from "~/server/sources/producthunt";
import getEastmoneyList from "~/server/sources/eastmoney";
import getBBCNewsList from "~/server/sources/bbcnews";
import getV2exnewList from "~/server/sources/v2exnew";

// 保持旧的 fetcherMap 用于向后兼容
const fetcherMap: Record<string, () => Promise<NewsItem[]>> = {
  weibo: getWeiboHotList.weibo!,
  zhihu: getZhihuHotList,
  "36kr": get36krHotList,
  baidu: getBaiduHotList,
  "bilibili-hot-search": getBilibiliHotSearch,
  "bilibili-hot-video": getBilibiliHotVideo,
  "bilibili-ranking": getBilibiliRanking,
  github: getGithubHotList,
  ithome: getIthomeHotList.ithome!,
  cankaoxiaoxi: getCankaoxiaoxiHotList,

  douyin: getDouyinHotList.douyin!,
  fastbull: getFastbullHotList.fastbull!,

  "fastbull-news": getFastbullHotList["fastbull-news"]!,
  gelonghui: getGelonghuiHotList,

  hupu: getHupuHotList,
  ifeng: getIfengHotList,
  jin10: getJin10HotList,
  juejin: getJuejinHotList,
  kuaishou: getKuaishouHotList,

  nowcoder: getNowcoderHotList,
  "pcbeta-windows11": getPcbetaHotList["pcbeta-windows11"]!,

  solidot: getSolidotHotList,
  sputniknewscn: getSputniknewscnHotList,
  sspai: getSspaiHotList,
  thepaper: getThepaperHotList,
  tieba: getTiebaHotList,
  toutiao: getToutiaoHotList,

  wallstreetcn: getWallstreetcnHotList.wallstreetcn!,
  "wallstreetcn-news": getWallstreetcnHotList["wallstreetcn-news"]!,
  "wallstreetcn-hot": getWallstreetcnHotList["wallstreetcn-hot"]!,
  xueqiu: getXueqiuHotList.xueqiu!,

  coolapk: getCoolapkHotList.coolapk!,

  // 新增数据源
  hackernews: getHackerNewsList,
  producthunt: getProductHuntList,
  eastmoney: getEastmoneyList,
  bbcnews: getBBCNewsList,
  v2exnew: getV2exnewList,
};

/**
 * @deprecated 使用 sourceManager.getHotList() 替代
 */
export async function getHotList(id: string): Promise<NewsItem[]> {
  const fetcher = fetcherMap[id];
  if (!fetcher) {
    throw new Error("Invalid source id");
  }
  return await fetcher();
}

/**
 * 初始化旧服务到新注册表的迁移
 * 在应用启动时调用一次
 */
export async function initializeLegacyMigration() {
  await migrateFromOldService(fetcherMap);
}
