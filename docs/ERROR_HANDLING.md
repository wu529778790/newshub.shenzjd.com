# 错误处理系统

## 概述

新的错误处理系统提供了统一、可扩展的错误管理机制，确保数据源失败不会影响整个系统。

## 核心组件

### 1. 错误类型

```typescript
// 基础错误类型
DataSourceError      // 数据源基础错误
NetworkError         // 网络请求失败
ParseError           // 数据解析失败
ConfigError          // 配置错误
```

### 2. ErrorHandler 类

```typescript
import { ErrorHandler } from '~/server/utils/error-handler';

const handler = ErrorHandler.getInstance();

// 处理错误并返回降级数据
const result = handler.handle('weibo', error, []);

// 包装异步操作，自动重试
const result = await handler.wrap('weibo', async () => {
  return await fetchData();
}, {
  fallback: [],
  retryCount: 3,
  retryDelay: 1000
});
```

### 3. 增强的 Fetch 工具

```typescript
import { enhancedFetch, fetchHtml } from '~/server/utils/fetch-enhanced';

// 自动重试、超时、验证
const data = await enhancedFetch('https://api.example.com', {
  sourceId: 'my-source',
  retries: 3,
  timeout: 5000,
  validate: (data) => data && data.items
});

// HTML 获取
const html = await fetchHtml('https://example.com', {
  sourceId: 'my-source',
  retries: 2
});
```

## 使用模式

### 模式 1：使用 executeWithMetrics（推荐）

```typescript
import { executeWithMetrics } from '~/server/utils/source-registry';
import { enhancedFetch } from '~/server/utils/fetch-enhanced';

export async function getMySource(): Promise<NewsItem[]> {
  return executeWithMetrics('my-source', async () => {
    // 自动处理错误和指标记录
    const data = await enhancedFetch('https://api.example.com', {
      sourceId: 'my-source',
      retries: 3,
    });

    return data.items.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
    }));
  });
}
```

### 模式 2：手动错误处理

```typescript
import { withErrorHandling, DataSourceError } from '~/server/utils/error-handler';

export async function getMySource(): Promise<NewsItem[]> {
  return withErrorHandling(
    'my-source',
    async () => {
      const response = await fetch('https://api.example.com');

      if (!response.ok) {
        throw new DataSourceError('my-source', 'HTTP error', response.status);
      }

      const data = await response.json();
      return parseData(data);
    },
    {
      fallback: [],
      retryCount: 3,
      retryDelay: 1000
    }
  );
}
```

### 模式 3：聚合多个数据源

```typescript
export async function getAggregatedSource(): Promise<NewsItem[]> {
  const results = await Promise.allSettled([
    enhancedFetch('https://api1.example.com', { sourceId: 'api1' }),
    enhancedFetch('https://api2.example.com', { sourceId: 'api2' }),
  ]);

  const items: NewsItem[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value.items);
    } else {
      // 记录错误但不中断
      console.warn('Source failed:', result.reason.message);
    }
  });

  return items;
}
```

## 错误分类和处理

### 可重试的错误

```typescript
import { ErrorClassifier } from '~/server/utils/error-handler';

// 网络错误、5xx 错误可重试
if (ErrorClassifier.isRetryable(error)) {
  // 自动重试
}
```

### 临时性错误

```typescript
// 429 (限流)、503 (服务不可用)
if (ErrorClassifier.isTemporary(error)) {
  // 增加重试延迟
}
```

### 需要通知的错误

```typescript
// 配置错误或持续失败
if (ErrorClassifier.shouldNotify(error)) {
  // 发送告警
}
```

## 降级策略

### 1. 返回空数组

```typescript
export async function getMySource(): Promise<NewsItem[]> {
  try {
    return await fetchData();
  } catch (error) {
    logger.error('Source failed:', error);
    return []; // 降级：返回空数组
  }
}
```

### 2. 返回缓存数据

```typescript
export async function getMySource(): Promise<NewsItem[]> {
  try {
    const data = await fetchData();
    await cache.set('my-source', data);
    return data;
  } catch (error) {
    // 降级：返回缓存
    const cached = await cache.get('my-source');
    return cached || [];
  }
}
```

### 3. 返回备用数据源

```typescript
export async function getMySource(): Promise<NewsItem[]> {
  try {
    return await fetchPrimarySource();
  } catch (error) {
    logger.warn('Primary source failed, using backup');
    try {
      return await fetchBackupSource();
    } catch (backupError) {
      return [];
    }
  }
}
```

## 错误监控

### 获取错误统计

```
GET /api/v1/errors
GET /api/v1/errors?source=weibo
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "sourceId": "all",
  "stats": [
    {
      "sourceId": "weibo",
      "count": 5,
      "lastError": 1703980700000,
      "errorTypes": {
        "NetworkError": 3,
        "ParseError": 2
      },
      "totalErrors": 5
    }
  ]
}
```

### 健康检查

```
GET /api/v1/health
```

包含每个数据源的错误率和健康状态。

## 最佳实践

### 1. 总是使用 try-catch

```typescript
// ✅ 好
export async function getMySource(): Promise<NewsItem[]> {
  try {
    return await fetchData();
  } catch (error) {
    logger.error(error);
    return [];
  }
}

// ❌ 坏
export async function getMySource(): Promise<NewsItem[]> {
  return await fetchData(); // 未处理错误
}
```

### 2. 设置合理的超时

```typescript
// ✅ 好
const data = await enhancedFetch(url, {
  sourceId: 'my-source',
  timeout: 5000, // 5秒超时
  retries: 2
});

// ❌ 坏
const data = await fetch(url); // 无超时，可能无限等待
```

### 3. 验证数据格式

```typescript
// ✅ 好
const data = await enhancedFetch(url, {
  sourceId: 'my-source',
  validate: (data) => Array.isArray(data.items)
});

// ❌ 坏
const data = await fetch(url);
return data.items; // 可能 undefined
```

### 4. 记录详细日志

```typescript
// ✅ 好
logger.error(`数据源 ${sourceId} 失败:`, {
  url,
  error: error.message,
  timestamp: Date.now()
});

// ❌ 坏
logger.error('Error'); // 信息不足
```

### 5. 使用降级策略

```typescript
// ✅ 好
try {
  return await fetchPrimary();
} catch (error) {
  return await fetchBackup() || [];
}

// ❌ 坏
try {
  return await fetchPrimary();
} catch (error) {
  throw error; // 导致整个 API 失败
}
```

## 错误处理流程图

```
数据源请求
    ↓
成功？ → 是 → 返回数据
    ↓ 否
检查错误类型
    ↓
可重试？ → 是 → 等待后重试（最多3次）
    ↓ 否
记录错误到监控
    ↓
返回降级数据（空数组/缓存/备用源）
    ↓
API 返回成功（即使部分数据源失败）
```

## 性能影响

### 错误处理开销

- **内存占用**：错误统计占用约 1KB/数据源
- **CPU 开销**：< 1%（仅在错误时记录）
- **网络开销**：重试增加 1-3 次请求

### 优化建议

1. **合理设置重试次数**：2-3 次足够
2. **使用指数退避**：避免雪崩效应
3. **缓存失败结果**：短时间内不重复请求
4. **异步上报**：不要阻塞主流程

## 未来扩展

### 计划功能

1. **自动告警**：错误率超过阈值时发送通知
2. **错误趋势分析**：识别模式和根因
3. **自动恢复**：检测恢复后自动重试
4. **错误注入测试**：模拟错误测试降级逻辑

### 集成建议

```typescript
// 集成 Sentry
import * as Sentry from '@sentry/node';

ErrorHandler.getInstance().onError((error, sourceId) => {
  Sentry.captureException(error, {
    tags: { sourceId }
  });
});

// 集成 Slack/钉钉告警
ErrorHandler.getInstance().onCriticalError((error, sourceId) => {
  sendSlackAlert(`数据源 ${sourceId} 严重错误: ${error.message}`);
});
```

## 总结

新的错误处理系统提供了：

- ✅ **统一的错误处理**：所有数据源使用相同模式
- ✅ **自动重试机制**：提高成功率
- ✅ **智能降级**：失败不影响其他源
- ✅ **详细监控**：实时了解数据源健康状态
- ✅ **易于扩展**：支持自定义错误类型和处理器

通过这个系统，即使部分数据源失败，用户仍然能看到可用的内容，大大提升了系统的稳定性和用户体验。
