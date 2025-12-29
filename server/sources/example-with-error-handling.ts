import type { NewsItem } from '@shared/types';
import { enhancedFetch, fetchHtml } from '~/server/utils/fetch-enhanced';
import { DataSource, executeWithMetrics } from '~/server/utils/source-registry';
import { ParseError } from '~/server/utils/error-handler';

/**
 * 示例：使用增强错误处理的数据源
 *
 * 这个示例展示了如何使用新的错误处理系统
 */

interface MySourceResponse {
  data: {
    items: Array<{
      id: string;
      title: string;
      link: string;
      time?: number;
    }>;
  };
}

/**
 * 数据源处理器 - 使用增强错误处理
 */
export async function getMySourceList(): Promise<NewsItem[]> {
  return executeWithMetrics('my-source', async () => {
    // 使用增强 fetch，自动处理错误和重试
    const data = await enhancedFetch<MySourceResponse>(
      'https://api.example.com/hot',
      {
        sourceId: 'my-source',
        retries: 3,
        retryDelay: 1000,
        timeout: 5000,
        // 数据验证
        validate: (data) => {
          return data && data.data && Array.isArray(data.data.items);
        },
      }
    );

    // 转换数据格式
    return data.data.items.map((item, index) => ({
      id: item.id,
      title: item.title,
      url: item.link,
      pubDate: item.time,
      extra: {
        info: `排名: ${index + 1}`,
      },
    }));
  });
}

/**
 * HTML 解析示例 - 带错误处理
 */
export async function getHtmlBasedSource(): Promise<NewsItem[]> {
  return executeWithMetrics('html-source', async () => {
    const html = await fetchHtml('https://example.com/hot', {
      sourceId: 'html-source',
      retries: 2,
    });

    // 手动解析 HTML
    const regex = /<div class="item">([\s\S]*?)<\/div>/g;
    const matches = [...html.matchAll(regex)];

    if (matches.length === 0) {
      throw new ParseError(
        'html-source',
        html,
        'No items found in HTML',
        { url: 'https://example.com/hot' }
      );
    }

    return matches.map((match, index) => {
      const content = match[1];
      const titleMatch = content.match(/<h2>(.*?)<\/h2>/);
      const urlMatch = content.match(/href="(.*?)"/);

      if (!titleMatch || !urlMatch) {
        throw new ParseError(
          'html-source',
          content,
          'Failed to parse item',
          { matchIndex: index }
        );
      }

      return {
        id: `item-${index}`,
        title: titleMatch[1],
        url: urlMatch[1],
        extra: { info: `排名: ${index + 1}` },
      };
    });
  });
}

/**
 * 多数据源聚合示例
 */
export async function getAggregatedSource(): Promise<NewsItem[]> {
  return executeWithMetrics('aggregated', async () => {
    // 并行获取多个数据源，即使部分失败也能返回部分数据
    const results = await Promise.allSettled([
      enhancedFetch('https://api1.example.com/data', {
        sourceId: 'aggregated-api1',
        retries: 2,
      }),
      enhancedFetch('https://api2.example.com/data', {
        sourceId: 'aggregated-api2',
        retries: 2,
      }),
    ]);

    const items: NewsItem[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // 成功的数据源
        const data = result.value;
        if (data && data.items) {
          items.push(
            ...data.items.map((item: any) => ({
              id: item.id,
              title: item.title,
              url: item.url,
            }))
          );
        }
      } else {
        // 失败的数据源 - 记录但不中断
        console.warn(`聚合源 ${index} 失败:`, result.reason.message);
      }
    });

    return items;
  });
}

// 导出配置（自动注册）
export const mySourceConfig = {
  id: 'my-source',
  name: '我的数据源',
  home: 'https://example.com',
  type: 'hotspot' as const,
  interval: 10 * 60 * 1000,
  enabled: true,
  column: 'tech',
  color: 'blue',
  handler: getMySourceList,
};

export const htmlSourceConfig = {
  id: 'html-source',
  name: 'HTML数据源',
  home: 'https://example.com',
  type: 'hotspot' as const,
  interval: 10 * 60 * 1000,
  enabled: true,
  column: 'tech',
  color: 'green',
  handler: getHtmlBasedSource,
};

export const aggregatedSourceConfig = {
  id: 'aggregated',
  name: '聚合数据源',
  home: 'https://example.com',
  type: 'hotspot' as const,
  interval: 10 * 60 * 1000,
  enabled: true,
  column: 'tech',
  color: 'purple',
  handler: getAggregatedSource,
};
