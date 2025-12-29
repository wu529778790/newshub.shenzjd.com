import type { NewsItem } from '@shared/types';
import { myFetch } from '~/server/utils/fetch';
import { DataSource, executeWithMetrics } from '~/server/utils/source-registry';

/**
 * 百度热搜数据源 - 新架构示例
 *
 * 使用新的注册表系统，自动注册，无需手动修改 hot-list.service.ts
 */

interface BaiduHotItem {
  word: string;
  rawUrl: string;
  isTop?: boolean;
}

interface BaiduResponse {
  data: {
    cards: {
      content: BaiduHotItem[];
    }[];
  };
}

/**
 * 百度热搜处理器
 *
 * 使用 @DataSource 装饰器自动注册
 */
export async function getBaiduHotList(): Promise<NewsItem[]> {
  return executeWithMetrics('baidu', async () => {
    const rawData: string = await myFetch(
      `https://top.baidu.com/board?tab=realtime`
    );
    const jsonStr = (rawData as string).match(/<!--s-data:(.*?)-->/s);

    if (!jsonStr || !jsonStr[1]) {
      throw new Error('Failed to extract Baidu hot list data.');
    }

    const data: BaiduResponse = JSON.parse(jsonStr[1]);

    if (!data.data?.cards?.[0]?.content) {
      throw new Error('Invalid Baidu response structure');
    }

    return data.data.cards[0].content
      .filter((k) => !k.isTop)
      .map((item, index) => ({
        id: item.rawUrl,
        title: item.word,
        url: item.rawUrl,
        extra: {
          info: `排名: ${index + 1}`,
        },
      }));
  });
}

/**
 * 使用装饰器自动注册（推荐方式）
 */
export const baiduConfig = {
  id: 'baidu',
  name: '百度热搜',
  home: 'https://www.baidu.com',
  type: 'hotspot' as const,
  interval: 10 * 60 * 1000, // 10分钟
  enabled: true,
  column: 'china',
  color: 'blue',
  handler: getBaiduHotList
};

// 如果使用装饰器方式（需要在运行时执行）
// @DataSource({
//   id: 'baidu',
//   name: '百度热搜',
//   home: 'https://www.baidu.com',
//   type: 'hotspot',
//   interval: 10 * 60 * 1000,
//   enabled: true,
//   column: 'china',
//   color: 'blue'
// })
// export async function getBaiduHotList(): Promise<NewsItem[]> {
//   // ... 实现逻辑
// }
