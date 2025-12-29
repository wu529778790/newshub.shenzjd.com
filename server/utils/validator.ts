import { z } from 'zod';
import { logger } from './logger';

/**
 * Zod 验证器工具
 * 提供统一的数据验证和转换
 */

/**
 * 验证数据并返回结果
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  options: {
    sourceId?: string;
    strict?: boolean;
  } = {}
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const { strict = false } = options;

  try {
    const result = strict
      ? schema.strict().parse(data)
      : schema.parse(data);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (options.sourceId) {
        logger.warn(`验证失败 [${options.sourceId}]:`, error.issues);
      }
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * 安全解析，返回默认值
 */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  defaultValue: z.infer<T>,
  options?: {
    sourceId?: string;
    logError?: boolean;
  }
): z.infer<T> {
  const result = validate(schema, data, options);

  if (!result.success) {
    if (options?.logError !== false) {
      logger.warn('解析失败，使用默认值:', {
        errors: result.errors.issues,
        defaultValue,
      });
    }
    return defaultValue;
  }

  return result.data;
}

/**
 * 验证数组中的每个元素
 */
export function validateArray<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown[],
  options?: {
    sourceId?: string;
    skipInvalid?: boolean;
  }
): { valid: z.infer<T>[]; invalid: { data: unknown; errors: z.ZodError }[] } {
  const valid: z.infer<T>[] = [];
  const invalid: { data: unknown; errors: z.ZodError }[] = [];

  data.forEach((item) => {
    const result = validate(schema, item, options);

    if (result.success) {
      valid.push(result.data);
    } else if (!options?.skipInvalid) {
      invalid.push({ data: item, errors: result.errors });
    }
  });

  return { valid, invalid };
}

/**
 * 验证器类
 */
export class Validator {
  constructor(private sourceId?: string) {}

  /**
   * 验证单个数据
   */
  validate<T extends z.ZodTypeAny>(schema: T, data: unknown) {
    return validate(schema, data, { sourceId: this.sourceId });
  }

  /**
   * 安全解析
   */
  safeParse<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown,
    defaultValue: z.infer<T>
  ) {
    return safeParse(schema, data, defaultValue, { sourceId: this.sourceId });
  }

  /**
   * 验证数组
   */
  validateArray<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown[],
    skipInvalid = true
  ) {
    return validateArray(schema, data, {
      sourceId: this.sourceId,
      skipInvalid,
    });
  }

  /**
   * 验证并转换
   */
  transform<T extends z.ZodTypeAny, U>(
    schema: T,
    data: unknown,
    transformer: (data: z.infer<T>) => U
  ): U | null {
    const result = this.validate(schema, data);

    if (result.success) {
      return transformer(result.data);
    }

    return null;
  }
}

/**
 * 常用验证器
 */
export const Validators = {
  // URL 验证
  url: z.string().url(),

  // 非空字符串
  nonEmptyString: z.string().min(1),

  // 正整数
  positiveInt: z.number().int().positive(),

  // 日期时间戳
  timestamp: z.number().min(0),

  // 数组
  nonEmptyArray: z.array(z.any()).min(1),

  // 对象
  object: z.object({}),

  // 可选字符串
  optionalString: z.string().optional(),

  // 验证 NewsItem 数组
  newsItems: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      title: z.string().min(1),
      url: z.string().url(),
    })
  ),

  // 验证数据源配置
  dataSourceConfig: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    home: z.string().url(),
    type: z.enum(['realtime', 'hotspot', 'news']),
    interval: z.number().min(1000),
    enabled: z.boolean(),
  }),
};

/**
 * 验证中间件（用于 API）
 */
export function validationMiddleware<T extends z.ZodTypeAny>(
  schema: T,
  type: 'query' | 'body' | 'params' = 'query'
) {
  return (event: any) => {
    let data: unknown;

    switch (type) {
      case 'query':
        data = getQuery(event);
        break;
      case 'body':
        data = readBody(event);
        break;
      case 'params':
        data = getRouterParams(event);
        break;
    }

    const result = validate(schema, data);

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: {
          issues: result.errors.issues,
          message: 'Invalid request parameters',
        },
      });
    }

    // 将验证后的数据附加到事件对象
    event.validated = result.data;
  };
}

/**
 * 数据清洗工具
 */
export const Sanitizer = {
  // 清理字符串
  string(value: unknown, defaultValue = ''): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return defaultValue;
  },

  // 清理数字
  number(value: unknown, defaultValue = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  },

  // 清理布尔值
  boolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') return value !== 0;
    return defaultValue;
  },

  // 清理 URL
  url(value: unknown, defaultValue = ''): string {
    const str = this.string(value);
    try {
      new URL(str);
      return str;
    } catch {
      return defaultValue;
    }
  },

  // 清理数组
  array(value: unknown, defaultValue: any[] = []): any[] {
    if (Array.isArray(value)) return value;
    return defaultValue;
  },

  // 清理对象
  object(value: unknown, defaultValue = {}): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return defaultValue;
  },

  // 清理日期
  date(value: unknown, defaultValue?: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const timestamp = Date.parse(value);
      return isNaN(timestamp) ? (defaultValue ?? Date.now()) : timestamp;
    }
    return defaultValue ?? Date.now();
  },

  // 清理扩展字段
  extra(value: unknown): Record<string, any> {
    const obj = this.object(value, {});
    const cleaned: Record<string, any> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined || val === null) continue;

      // 标准化某些字段
      if (key === 'icon' && typeof val === 'string') {
        cleaned.icon = { url: val, scale: 1 };
      } else if (key === 'date') {
        cleaned.date = this.date(val);
      } else if (key === 'rank' || key === 'score') {
        cleaned[key] = this.number(val);
      } else {
        cleaned[key] = val;
      }
    }

    return cleaned;
  },
};

/**
 * 数据验证和清理的便捷函数
 */
export function sanitizeData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> | null {
  const result = validate(schema, data);

  if (result.success) {
    return result.data;
  }

  // 尝试清理
  if (Array.isArray(data)) {
    // 数组：清理每个元素
    const cleaned = data
      .map(item => sanitizeData(schema, item))
      .filter(item => item !== null);

    return cleaned.length > 0 ? cleaned as any : null;
  }

  // 对象：尝试修复常见问题
  if (data && typeof data === 'object') {
    const cleaned = { ...data };

    // 根据 schema 要求添加缺失字段
    const shape = schema.shape;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (!(key in cleaned)) {
        if (fieldSchema instanceof z.ZodOptional) {
          // 可选字段，跳过
        } else if (fieldSchema instanceof z.ZodDefault) {
          cleaned[key] = fieldSchema._def.defaultValue();
        } else {
          // 无法修复
          return null;
        }
      }
    }

    // 重新验证
    const retry = validate(schema, cleaned);
    return retry.success ? retry.data : null;
  }

  return null;
}
