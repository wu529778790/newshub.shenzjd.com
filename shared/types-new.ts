/**
 * 新的类型系统 - 统一和标准化
 * 使用 Zod 进行运行时验证
 */

import { z } from 'zod';

// ============================================
// 基础类型定义
// ============================================

/**
 * 数据源类型
 */
export const DataSourceTypeSchema = z.enum(['realtime', 'hotspot', 'news']);
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

/**
 * 颜色主题
 */
export const ColorSchema = z.enum([
  'primary', 'red', 'blue', 'green', 'yellow', 'purple', 'pink',
  'gray', 'orange', 'teal', 'cyan', 'indigo', 'emerald', 'rose',
  'violet', 'amber', 'lime', 'sky', 'slate', 'zinc', 'neutral', 'stone'
]);
export type Color = z.infer<typeof ColorSchema>;

/**
 * 新闻条目 - 核心数据结构
 */
export const NewsItemSchema = z.object({
  id: z.union([z.string(), z.number()]).describe('唯一标识符'),
  title: z.string().min(1, '标题不能为空').describe('新闻标题'),
  url: z.string().url('必须是有效的URL').describe('原文链接'),
  mobileUrl: z.string().url().optional().describe('移动端链接'),
  pubDate: z.union([z.number(), z.string()]).optional().describe('发布时间'),

  // 扩展字段 - 使用标准化的结构
  extra: z.object({
    hover: z.string().optional().describe('悬停提示'),
    date: z.union([z.number(), z.string()]).optional().describe('格式化日期'),
    info: z.union([z.string(), z.literal(false)]).optional().describe('附加信息'),
    diff: z.number().optional().describe('变化值'),
    icon: z.union([
      z.literal(false),
      z.string(),
      z.object({
        url: z.string().url(),
        scale: z.number().min(0.1).max(10)
      })
    ]).optional().describe('图标或图片'),
    rank: z.number().optional().describe('排名'),
    score: z.number().optional().describe('分数/热度'),
    heat: z.string().optional().describe('热度文本'),
  }).optional().describe('扩展信息'),

  // 元数据
  sourceId: z.string().optional().describe('数据源ID'),
  fetchedAt: z.number().optional().describe('获取时间戳'),
}).strict();

export type NewsItem = z.infer<typeof NewsItemSchema>;

/**
 * 数据源配置
 */
export const DataSourceConfigSchema = z.object({
  id: z.string().min(1).describe('数据源唯一标识'),
  name: z.string().min(1).describe('数据源名称'),
  home: z.string().url().describe('主页URL'),
  type: DataSourceTypeSchema.describe('数据源类型'),
  interval: z.number().min(1000).describe('刷新间隔(毫秒)'),
  enabled: z.boolean().default(true).describe('是否启用'),
  column: z.string().optional().describe('分类'),
  color: ColorSchema.optional().describe('颜色主题'),
  title: z.string().optional().describe('副标题'),
  desc: z.string().optional().describe('描述'),
  disable: z.union([z.boolean(), z.literal('cf')]).optional().describe('禁用原因'),
}).strict();

export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;

/**
 * API 响应格式
 */
export const ApiResponseSchema = z.object({
  apiVersion: z.string().describe('API版本'),
  timestamp: z.number().describe('响应时间戳'),
  status: z.enum(['success', 'error']).optional(),
  message: z.string().optional(),
  data: z.array(NewsItemSchema).optional(),
  meta: z.record(z.any()).optional().describe('元数据'),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

/**
 * 批量请求结果
 */
export const BatchResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  data: z.array(NewsItemSchema).optional(),
  count: z.number().optional(),
  error: z.string().optional(),
});

export type BatchResult = z.infer<typeof BatchResultSchema>;

/**
 * 健康状态
 */
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * 数据源指标
 */
export const SourceMetricsSchema = z.object({
  totalRequests: z.number().default(0),
  successfulRequests: z.number().default(0),
  failedRequests: z.number().default(0),
  avgResponseTime: z.number().default(0),
  lastSuccess: z.number().nullable().default(null),
  lastError: z.number().nullable().default(null),
  errorTypes: z.record(z.number()).default({}),
});

export type SourceMetrics = z.infer<typeof SourceMetricsSchema>;

/**
 * 数据源健康状态
 */
export const SourceHealthSchema = z.object({
  status: HealthStatusSchema,
  reason: z.string().optional(),
});

export type SourceHealth = z.infer<typeof SourceHealthSchema>;

// ============================================
// 旧类型兼容（逐步迁移）
// ============================================

/**
 * @deprecated 使用 NewsItem 替代
 */
export interface HotItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  rank?: number;
  score?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * @deprecated 使用 NewsItem 替代
 */
export interface CacheInfo {
  id: string;
  items: NewsItem[];
  updated: number;
}

/**
 * @deprecated 使用 ApiResponse 替代
 */
export interface SourceResponse {
  status: 'success' | 'cache';
  id: string;
  updatedTime: number | string;
  items: NewsItem[];
}

// ============================================
// 类型守卫函数
// ============================================

/**
 * 验证是否为有效的 NewsItem
 */
export function isValidNewsItem(data: any): data is NewsItem {
  const result = NewsItemSchema.safeParse(data);
  return result.success;
}

/**
 * 验证是否为有效的数据源配置
 */
export function isValidDataSourceConfig(data: any): data is DataSourceConfig {
  const result = DataSourceConfigSchema.safeParse(data);
  return result.success;
}

/**
 * 验证 API 响应
 */
export function isValidApiResponse(data: any): data is ApiResponse {
  const result = ApiResponseSchema.safeParse(data);
  return result.success;
}

// ============================================
// 转换函数
// ============================================

/**
 * 将旧格式转换为新格式
 */
export function convertToNewFormat(oldItem: any): NewsItem {
  // 尝试解析旧格式
  const parsed = NewsItemSchema.safeParse({
    id: oldItem.id || oldItem._id,
    title: oldItem.title || oldItem.name,
    url: oldItem.url || oldItem.link,
    mobileUrl: oldItem.mobileUrl,
    pubDate: oldItem.pubDate || oldItem.time || oldItem.timestamp,
    extra: {
      info: oldItem.info || oldItem.description,
      rank: oldItem.rank || oldItem.order,
      score: oldItem.score || oldItem.hot,
      heat: oldItem.heat,
      icon: oldItem.icon || oldItem.image,
      date: oldItem.date,
      diff: oldItem.diff,
    },
    sourceId: oldItem.source || oldItem.sourceId,
    fetchedAt: oldItem.fetchedAt || Date.now(),
  });

  if (parsed.success) {
    return parsed.data;
  }

  // 如果解析失败，返回最小可用格式
  return {
    id: oldItem.id || String(Date.now()),
    title: oldItem.title || 'Unknown',
    url: oldItem.url || '#',
  };
}

/**
 * 批量转换
 */
export function convertArrayToNewFormat(items: any[]): NewsItem[] {
  return items.map(convertToNewFormat).filter(isValidNewsItem);
}

// ============================================
// 响应构建器
// ============================================

/**
 * 构建成功的 API 响应
 */
export function buildSuccessResponse(
  data: NewsItem[],
  options: {
    apiVersion?: string;
    sourceId?: string;
    cached?: boolean;
  } = {}
): ApiResponse {
  return {
    apiVersion: options.apiVersion || '1.0',
    timestamp: Date.now(),
    status: 'success',
    data,
    meta: {
      count: data.length,
      sourceId: options.sourceId,
      cached: options.cached || false,
    },
  };
}

/**
 * 构建错误响应
 */
export function buildErrorResponse(
  message: string,
  options: {
    apiVersion?: string;
    sourceId?: string;
    statusCode?: number;
  } = {}
): ApiResponse {
  return {
    apiVersion: options.apiVersion || '1.0',
    timestamp: Date.now(),
    status: 'error',
    message,
    meta: {
      sourceId: options.sourceId,
      statusCode: options.statusCode,
    },
  };
}

/**
 * 构建批量响应
 */
export function buildBatchResponse(
  results: BatchResult[]
): {
  apiVersion: string;
  timestamp: number;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: BatchResult[];
} {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount,
    },
    results,
  };
}

// ============================================
// 验证中间件
// ============================================

/**
 * 验证并清理数据
 */
export function sanitizeNewsItem(data: any): NewsItem | null {
  const result = NewsItemSchema.safeParse(data);

  if (!result.success) {
    // 尝试修复常见问题
    const fixed = {
      id: data.id || data._id || String(Date.now()),
      title: data.title || data.name || 'Untitled',
      url: data.url || data.link || '#',
      pubDate: data.pubDate || data.time,
      extra: {
        info: data.info || data.description,
        rank: data.rank,
        score: data.score,
      },
    };

    const retry = NewsItemSchema.safeParse(fixed);
    return retry.success ? retry.data : null;
  }

  return result.data;
}

/**
 * 验证数据数组
 */
export function sanitizeNewsItems(data: any[]): NewsItem[] {
  return data
    .map(sanitizeNewsItem)
    .filter((item): item is NewsItem => item !== null);
}
