# 数据源注册表系统

## 概述

新的数据源注册表系统解决了原有硬编码问题，提供了统一的数据源管理、错误处理、监控和扩展机制。

## 核心优势

### 1. 零配置扩展
- ✅ 只需在 `server/sources/` 添加文件即可自动注册
- ✅ 无需修改 `hot-list.service.ts`
- ✅ 无需修改 `sources.ts`
- ✅ 无需修改 API 端点

### 2. 统一的错误处理
- ✅ 自动捕获和记录错误
- ✅ 失败的数据源不影响其他源
- ✅ 统一的错误响应格式

### 3. 内置监控
- ✅ 自动记录请求指标
- ✅ 响应时间统计
- ✅ 成功率计算
- ✅ 健康状态检查

### 4. 并发控制
- ✅ 批量 API 支持
- ✅ 可配置的并发数
- ✅ 分批处理避免请求风暴

## 使用方法

### 方式一：使用配置对象（推荐）

```typescript
// server/sources/my-source.ts
import type { NewsItem } from '@shared/types';
import { myFetch } from '~/server/utils/fetch';
import { executeWithMetrics } from '~/server/utils/source-registry';

export async function getMySourceList(): Promise<NewsItem[]> {
  return executeWithMetrics('my-source', async () => {
    const data = await myFetch('https://api.example.com/hot');
    return data.items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
    }));
  });
}

// 导出配置（自动注册）
export const mySourceConfig = {
  id: 'my-source',
  name: '我的数据源',
  home: 'https://example.com',
  type: 'hotspot' as const,
  interval: 10 * 60 * 1000, // 10分钟
  enabled: true,
  column: 'tech',
  color: 'blue',
  handler: getMySourceList
};
```

### 方式二：使用装饰器

```typescript
// server/sources/my-source.ts
import { DataSource, executeWithMetrics } from '~/server/utils/source-registry';

@DataSource({
  id: 'my-source',
  name: '我的数据源',
  home: 'https://example.com',
  type: 'hotspot',
  interval: 10 * 60 * 1000,
  enabled: true,
  column: 'tech',
  color: 'blue'
})
export async function getMySourceList(): Promise<NewsItem[]> {
  return executeWithMetrics('my-source', async () => {
    // 你的实现逻辑
  });
}
```

### 方式三：手动注册（高级）

```typescript
// server/services/custom-setup.ts
import { sourceRegistry } from '~/server/utils/source-registry';

export function setupCustomSources() {
  sourceRegistry.register({
    id: 'custom',
    name: '自定义源',
    home: 'https://example.com',
    type: 'hotspot',
    interval: 5 * 60 * 1000,
    enabled: true,
    handler: async () => {
      // 你的逻辑
      return [];
    }
  });
}
```

## API 端点

### 获取所有数据源列表

```
GET /api/v1/sources
GET /api/v1/sources?includeDisabled=true
GET /api/v1/sources?metrics=true
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "count": 27,
  "sources": [
    {
      "id": "weibo",
      "name": "微博",
      "home": "https://weibo.com",
      "type": "realtime",
      "interval": 120000,
      "enabled": true,
      "column": "china",
      "color": "red"
    }
  ]
}
```

### 获取单个数据源

```
GET /api/v1/sources/:id
GET /api/v1/sources/weibo?force=true&limit=10
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "source": {
    "id": "weibo",
    "name": "微博",
    "home": "https://weibo.com",
    "type": "realtime",
    "interval": 120000
  },
  "data": [
    {
      "id": "123",
      "title": "热搜标题",
      "url": "https://weibo.com/...",
      "extra": { "info": "热度: 100万" }
    }
  ],
  "count": 10,
  "total": 20,
  "cached": false
}
```

### 批量获取

```
GET /api/v1/batch?sources=weibo,zhihu,baidu&limit=5&force=true
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "summary": {
    "total": 3,
    "success": 3,
    "failed": 0,
    "invalid": 0
  },
  "invalidSources": [],
  "results": [
    {
      "id": "weibo",
      "name": "微博",
      "success": true,
      "data": [...],
      "count": 5
    }
  ]
}
```

### 健康检查

```
GET /api/v1/health
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "status": "healthy",
  "system": {
    "uptime": "1234s",
    "nodeVersion": "v20.11.0",
    "memory": {
      "heapUsed": "45MB",
      "heapTotal": "64MB",
      "rss": "120MB"
    }
  },
  "sources": {
    "total": 27,
    "enabled": 27,
    "health": {
      "healthy": 25,
      "degraded": 2,
      "unhealthy": 0,
      "unknown": 0
    }
  },
  "details": [
    {
      "id": "weibo",
      "name": "微博",
      "health": "available",
      "enabled": true,
      "metrics": {
        "totalRequests": 100,
        "successRate": "98.00%",
        "avgResponseTime": "450ms",
        "lastSuccess": "2024-12-30T02:00:00.000Z",
        "lastError": null
      }
    }
  ]
}
```

## 核心组件

### SourceRegistry 类

```typescript
class SourceRegistry {
  // 注册数据源
  register(config: DataSourceConfig): void

  // 批量注册
  registerBatch(configs: DataSourceConfig[]): void

  // 获取数据源
  get(id: string): DataSourceConfig | undefined

  // 列表
  list(filter?: Partial<DataSourceConfig>): DataSourceConfig[]
  listEnabled(): DataSourceConfig[]

  // 指标
  recordMetrics(id: string, duration: number, success: boolean, error?: Error): void
  getMetrics(id: string): SourceMetrics | undefined
  getAllMetrics(): Record<string, SourceMetrics>

  // 健康检查
  getHealth(id: string): SourceHealth
}
```

### SourceManager 类

```typescript
class SourceManager {
  // 获取单个数据源
  getHotList(id: string, options?: { force?: boolean }): Promise<NewsItem[]>

  // 批量获取
  getHotLists(ids: string[], options?: {
    force?: boolean;
    concurrency?: number
  }): Promise<Record<string, { success: boolean; data: NewsItem[]; error?: string }>>

  // 列表和状态
  listEnabledSources(): DataSourceConfig[]
  isAvailable(id: string): boolean
  getStats(): any
}
```

## 迁移指南

### 从旧系统迁移

1. **保持现有代码不变** - 旧的 `hot-list.service.ts` 仍然可用
2. **添加新数据源** - 使用新的注册表系统
3. **逐步迁移** - 可以混合使用新旧系统
4. **最终移除** - 完全迁移后删除旧代码

### 迁移步骤

```typescript
// 1. 在 server/services/source-initializer.ts 中
// 已经自动执行迁移，无需手动操作

// 2. 新数据源使用新系统
// server/sources/new-source.ts
export const newSourceConfig = {
  id: 'new-source',
  // ... 配置
  handler: async () => { /* ... */ }
};

// 3. 旧数据源保持不变，会自动迁移
```

## 最佳实践

### 1. 错误处理

```typescript
import { executeWithMetrics } from '~/server/utils/source-registry';

export async function getMySource(): Promise<NewsItem[]> {
  return executeWithMetrics('my-source', async () => {
    // 自动处理错误和指标记录
    const data = await myFetch('https://api.example.com');
    return parseData(data);
  });
}
```

### 2. 配置管理

```typescript
// 使用常量定义配置
export const MY_SOURCE_CONFIG = {
  id: 'my-source',
  name: '我的源',
  interval: 10 * 60 * 1000,
  // ...
} as const;

export const mySourceHandler = async () => { /* ... */ };

export default {
  ...MY_SOURCE_CONFIG,
  handler: mySourceHandler
};
```

### 3. 测试

```typescript
// __tests__/my-source.test.ts
import { getMySource } from '~/server/sources/my-source';

describe('My Source', () => {
  it('should return news items', async () => {
    const result = await getMySource();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

## 性能优化

### 1. 并发控制

```typescript
// 批量获取时自动控制并发
const results = await sourceManager.getHotLists(ids, {
  concurrency: 5 // 最大并发数
});
```

### 2. 缓存集成

```typescript
// 未来版本将集成缓存
const data = await sourceManager.getHotList('weibo', {
  force: false // 使用缓存
});
```

### 3. 按需加载

```typescript
// 只加载可见的数据源
const visibleSources = sources.filter(s => isElementInViewport(s.id));
await sourceManager.getHotLists(visibleSources.map(s => s.id));
```

## 监控和可观测性

### 指标类型

- **totalRequests** - 总请求数
- **successfulRequests** - 成功请求数
- **failedRequests** - 失败请求数
- **avgResponseTime** - 平均响应时间
- **lastSuccess** - 最后成功时间
- **lastError** - 最后错误时间
- **errorTypes** - 错误类型统计

### 健康状态

- **healthy** - 成功率 > 80%，最近无错误
- **degraded** - 成功率 50-80%，或最近有错误
- **unhealthy** - 成功率 < 50%
- **unknown** - 无数据

## 未来扩展

### 计划功能

1. **持久化缓存** - 支持 Redis/SQLite
2. **自动重试** - 失败的源自动重试
3. **动态配置** - 运行时修改配置
4. **插件系统** - 支持自定义中间件
5. **API 文档** - 自动生成 Swagger/OpenAPI

### 示例扩展

```typescript
// 自定义中间件
sourceRegistry.register({
  id: 'my-source',
  // ...
  handler: async () => {
    // 前置钩子
    await beforeFetch();

    const result = await fetch();

    // 后置钩子
    await afterFetch(result);

    return result;
  }
});
```

## 总结

新的数据源注册表系统提供了：

- ✅ **零配置扩展** - 添加新源只需一个文件
- ✅ **统一管理** - 所有源集中管理
- ✅ **内置监控** - 自动记录指标
- ✅ **错误隔离** - 单源失败不影响其他
- ✅ **并发控制** - 避免请求风暴
- ✅ **向后兼容** - 旧代码无需修改
- ✅ **类型安全** - 完整的 TypeScript 支持

通过这个系统，添加新数据源变得极其简单，维护成本大幅降低，系统稳定性显著提升。
