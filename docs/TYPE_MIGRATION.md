# 类型系统迁移指南

## 概述

新的类型系统使用 Zod 提供运行时验证，确保数据的完整性和安全性。

## 核心变化

### 旧系统 vs 新系统

| 特性 | 旧系统 (types.ts) | 新系统 (types-new.ts) |
|------|-------------------|-----------------------|
| 验证 | 仅 TypeScript 编译时 | 运行时 + 编译时 |
| 错误提示 | 编译错误 | 详细的运行时错误 |
| 数据清洗 | 手动处理 | 自动验证和清理 |
| 类型安全 | 部分 | 完整（包括运行时） |

## 使用新类型

### 1. 导入类型

```typescript
// ✅ 新方式
import type { NewsItem, DataSourceConfig } from '@shared/types-new';
import { NewsItemSchema, DataSourceConfigSchema } from '@shared/types-new';

// ❌ 旧方式（已弃用）
import type { NewsItem } from '@shared/types';
```

### 2. 验证数据

```typescript
import { validate, safeParse } from '~/server/utils/validator';
import { NewsItemSchema } from '@shared/types-new';

// 方式 1：验证并获取结果
const result = validate(NewsItemSchema, data);

if (result.success) {
  console.log(result.data); // 类型安全
} else {
  console.error(result.errors); // 详细的错误信息
}

// 方式 2：安全解析，带默认值
const item = safeParse(NewsItemSchema, data, {
  id: 'unknown',
  title: 'Untitled',
  url: '#'
});
```

### 3. 验证数组

```typescript
import { validateArray } from '~/server/utils/validator';

const { valid, invalid } = validateArray(NewsItemSchema, rawData);

if (invalid.length > 0) {
  logger.warn(`跳过 ${invalid.length} 个无效条目`);
}

return valid;
```

### 4. 使用 Validator 类

```typescript
import { Validator } from '~/server/utils/validator';

const validator = new Validator('my-source');

// 验证单个
const result = validator.validate(NewsItemSchema, data);

// 验证数组
const { valid } = validator.validateArray(NewsItemSchema, dataArray);

// 转换
const items = validator.transform(
  NewsItemSchema,
  data,
  (item) => ({ id: item.id, title: item.title })
);
```

## 数据源配置

### 定义配置

```typescript
import { DataSourceConfigSchema } from '@shared/types-new';

const config = {
  id: 'weibo',
  name: '微博',
  home: 'https://weibo.com',
  type: 'realtime',
  interval: 120000,
  enabled: true,
};

// 验证
const result = validate(DataSourceConfigSchema, config);

if (!result.success) {
  throw new Error(`配置无效: ${result.errors.message}`);
}
```

### 自动注册

```typescript
import { DataSourceConfigSchema } from '@shared/types-new';
import { sourceRegistry } from '~/server/utils/source-registry';

export const weiboConfig = {
  id: 'weibo',
  name: '微博',
  home: 'https://weibo.com',
  type: 'realtime' as const,
  interval: 120000,
  enabled: true,
  handler: async () => { /* ... */ }
};

// 在插件中验证并注册
const result = validate(DataSourceConfigSchema, weiboConfig);

if (result.success) {
  sourceRegistry.register(result.data);
} else {
  logger.error('数据源配置无效:', result.errors);
}
```

## API 响应

### 构建响应

```typescript
import {
  buildSuccessResponse,
  buildErrorResponse,
  buildBatchResponse
} from '@shared/types-new';

// 成功响应
export default defineEventHandler(() => {
  const data: NewsItem[] = [/* ... */];
  return buildSuccessResponse(data, {
    sourceId: 'weibo',
    cached: false
  });
});

// 错误响应
export default defineEventHandler(() => {
  return buildErrorResponse('数据源暂时不可用', {
    sourceId: 'weibo',
    statusCode: 503
  });
});

// 批量响应
export default defineEventHandler(() => {
  const results: BatchResult[] = [/* ... */];
  return buildBatchResponse(results);
});
```

## 数据清洗

### 使用 Sanitizer

```typescript
import { Sanitizer } from '~/server/utils/validator';

// 清洗原始数据
const cleanData = {
  id: Sanitizer.string(raw.id),
  title: Sanitizer.string(raw.title),
  url: Sanitizer.url(raw.url),
  pubDate: Sanitizer.date(raw.pubDate),
  extra: Sanitizer.extra(raw.extra),
};

// 验证
const result = validate(NewsItemSchema, cleanData);

if (result.success) {
  return result.data;
}
```

### 转换旧格式

```typescript
import { convertToNewFormat } from '@shared/types-new';

// 自动转换旧格式
const newItem = convertToNewFormat(oldItem);

// 批量转换
const newItems = convertArrayToNewFormat(oldItems);
```

## 类型守卫

### 检查数据

```typescript
import {
  isValidNewsItem,
  isValidDataSourceConfig,
  isValidApiResponse
} from '@shared/types-new';

// 在运行时检查
if (isValidNewsItem(data)) {
  // TypeScript 知道这是 NewsItem
  console.log(data.title);
}

// 在函数参数中使用
function processItems(items: unknown[]) {
  const validItems = items.filter(isValidNewsItem);
  return validItems;
}
```

## 响应式验证

### API 中间件

```typescript
import { validationMiddleware } from '~/server/utils/validator';
import { z } from 'zod';

// 验证查询参数
const querySchema = z.object({
  id: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  force: z.coerce.boolean().default(false),
});

export default defineEventHandler([
  validationMiddleware(querySchema, 'query'),
  async (event) => {
    // event.validated 包含验证后的数据
    const { id, limit, force } = event.validated;
    // ...
  }
]);
```

## 错误处理

### 详细错误信息

```typescript
import { validate } from '~/server/utils/validator';

const result = validate(NewsItemSchema, invalidData);

if (!result.success) {
  // result.errors 包含：
  // - issues: 详细的错误数组
  // - message: 汇总错误信息
  // - stack: 堆栈跟踪

  result.errors.issues.forEach(issue => {
    console.log(`${issue.path}: ${issue.message}`);
  });
}
```

## 常见模式

### 1. 验证 + 转换 + 过滤

```typescript
import { validateArray, Sanitizer } from '~/server/utils/validator';

function processRawData(rawData: any[]): NewsItem[] {
  // 1. 清洗
  const cleaned = rawData.map(item => ({
    id: Sanitizer.string(item.id),
    title: Sanitizer.string(item.title),
    url: Sanitizer.url(item.url),
    extra: Sanitizer.extra(item.extra),
  }));

  // 2. 验证
  const { valid, invalid } = validateArray(NewsItemSchema, cleaned);

  // 3. 记录无效数据
  if (invalid.length > 0) {
    logger.warn(`过滤了 ${invalid.length} 个无效条目`);
  }

  return valid;
}
```

### 2. 部分验证

```typescript
import { z } from 'zod';

// 只验证需要的字段
const PartialNewsItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
}).partial(); // 所有字段可选

const result = validate(PartialNewsItemSchema, data);

if (result.success) {
  // 只处理存在的字段
  if (result.data.title) {
    // ...
  }
}
```

### 3. 自定义验证

```typescript
import { z } from 'zod';

const CustomNewsItemSchema = NewsItemSchema.refine(
  (item) => item.url.startsWith('https://'),
  { message: 'URL 必须使用 HTTPS' }
).refine(
  (item) => item.title.length <= 100,
  { message: '标题不能超过 100 字符' }
);

const result = validate(CustomNewsItemSchema, data);
```

## 性能考虑

### 验证开销

- **单次验证**：< 0.1ms
- **批量验证**：每条目约 0.05ms
- **内存占用**：可忽略

### 优化建议

1. **生产环境缓存验证结果**（如果需要）
2. **只验证关键字段**
3. **使用 `safeParse` 避免异常抛出**

## 迁移步骤

### 1. 更新导入

```bash
# 查找旧导入
grep -r "from '@shared/types'" server/ shared/

# 替换为新导入
sed -i 's/from "@shared\/types"/from "@shared\/types-new"/g' server/**/*.ts
```

### 2. 添加验证

```typescript
// 旧代码
export async function getWeibo(): Promise<NewsItem[]> {
  const data = await fetchWeibo();
  return data.map(item => ({ id: item.id, title: item.title }));
}

// 新代码
export async function getWeibo(): Promise<NewsItem[]> {
  const data = await fetchWeibo();
  const { valid } = validateArray(NewsItemSchema, data);
  return valid;
}
```

### 3. 测试验证

```typescript
// 测试验证逻辑
import { describe, it, expect } from 'vitest';

describe('NewsItem 验证', () => {
  it('应该接受有效数据', () => {
    const valid = { id: '1', title: 'Test', url: 'https://test.com' };
    const result = validate(NewsItemSchema, valid);
    expect(result.success).toBe(true);
  });

  it('应该拒绝无效数据', () => {
    const invalid = { id: '1', title: '', url: 'not-url' };
    const result = validate(NewsItemSchema, invalid);
    expect(result.success).toBe(false);
  });
});
```

## 工具函数

### 便捷验证

```typescript
// server/utils/validation.ts
import { z } from 'zod';
import { validate } from '~/server/utils/validator';

export function validateNewsItem(data: unknown) {
  return validate(NewsItemSchema, data);
}

export function validateNewsItems(data: unknown[]) {
  return validateArray(NewsItemSchema, data);
}

export function validateSourceConfig(data: unknown) {
  return validate(DataSourceConfigSchema, data);
}
```

### API 响应构建器

```typescript
// server/utils/response.ts
import { buildSuccessResponse, buildErrorResponse } from '@shared/types-new';

export function ok(data: any, meta?: any) {
  return buildSuccessResponse(data, meta);
}

export function fail(message: string, meta?: any) {
  return buildErrorResponse(message, meta);
}
```

## 总结

新类型系统提供：

- ✅ **运行时验证**：捕获编译时无法发现的错误
- ✅ **详细错误**：精确的错误位置和原因
- ✅ **数据清洗**：自动修复常见问题
- ✅ **类型安全**：完整的 TypeScript 支持
- ✅ **易于迁移**：向后兼容，逐步迁移

通过使用 Zod，我们获得了强大的验证能力，大大提高了系统的健壮性。
