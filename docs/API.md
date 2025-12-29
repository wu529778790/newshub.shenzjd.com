# API 设计文档

## 概述

系统采用 RESTful API 设计，支持多版本并存，提供完整的错误处理、缓存、并发控制和可观测性。

## API 版本策略

- **当前版本**: v1 (稳定)
- **旧版本**: 自动重定向到新版本
- **未来版本**: 通过路径 `/api/v2/` 支持

## 基础信息

**Base URL**: `http://localhost:3000`

**通用响应格式**:
```typescript
interface ApiResponse<T> {
  apiVersion: string;
  timestamp: number;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**通用错误格式**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "数据源不存在",
    "details": { "sourceId": "invalid-source" }
  }
}
```

## 数据源管理

### 1. 获取所有数据源列表

```
GET /api/v1/sources
GET /api/v1/sources?include=metadata,health
```

**查询参数**:
- `include`: 逗号分隔的附加信息 (metadata, health, stats)

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": [
    {
      "id": "weibo",
      "name": "微博热搜",
      "type": "realtime",
      "icon": "<svg>...</svg>",
      "refreshInterval": 120000,
      "metadata": {
        "description": "微博实时热搜榜",
        "category": "social",
        "tags": ["realtime", "hot"]
      },
      "health": {
        "status": "healthy",
        "lastSuccess": 1703980700000,
        "errorRate": 0.02
      }
    }
  ]
}
```

### 2. 获取单个数据源

```
GET /api/v1/sources/:id
```

**路径参数**:
- `id`: 数据源ID (e.g., `weibo`, `baidu`)

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": {
    "id": "weibo",
    "name": "微博热搜",
    "type": "realtime",
    "icon": "<svg>...</svg>",
    "refreshInterval": 120000,
    "config": {
      "timeout": 10000,
      "retry": 3,
      "cacheTTL": 120000
    }
  }
}
```

### 3. 获取数据源健康状态

```
GET /api/v1/sources/:id/health
```

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": {
    "sourceId": "weibo",
    "status": "healthy",
    "lastCheck": 1703980700000,
    "responseTime": 450,
    "errorRate": 0.02,
    "availability": 0.98
  }
}
```

## 数据获取

### 1. 获取热点数据

```
GET /api/v1/sources/:id/hot
GET /api/v1/sources/:id/hot?limit=10&force=true
```

**查询参数**:
- `limit`: 返回条目数量 (默认: 10, 最大: 50)
- `force`: 是否强制刷新缓存 (默认: false)
- `format`: 返回格式 (json, rss)

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": {
    "sourceId": "weibo",
    "items": [
      {
        "id": "12345",
        "title": "热搜标题",
        "url": "https://weibo.com/...",
        "pubDate": "2023-12-30T10:00:00Z",
        "rank": 1,
        "extra": {
          "info": "阅读量: 1.2亿",
          "hotScore": 98.5
        }
      }
    ],
    "count": 10,
    "cached": false
  }
}
```

### 2. 批量获取热点数据

```
GET /api/v1/sources/hot/batch
GET /api/v1/sources/hot/batch?ids=weibo,baidu,zhihu&limit=5
```

**查询参数**:
- `ids`: 逗号分隔的数据源ID
- `limit`: 每个数据源的条目限制
- `concurrency`: 并发数 (1-10, 默认: 5)
- `timeout`: 超时时间 (毫秒, 默认: 30000)

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": {
    "weibo": {
      "success": true,
      "items": [...],
      "count": 10,
      "responseTime": 450
    },
    "baidu": {
      "success": true,
      "items": [...],
      "count": 10,
      "responseTime": 320
    },
    "zhihu": {
      "success": false,
      "error": "请求超时",
      "responseTime": 30000
    }
  },
  "meta": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "avgResponseTime": 10256
  }
}
```

### 3. 流式获取（实时推送）

```
GET /api/v1/sources/hot/stream
GET /api/v1/sources/hot/stream?ids=weibo,baidu&chunkSize=5&delay=500
```

**查询参数**:
- `ids`: 逗号分隔的数据源ID
- `chunkSize`: 每批返回的条目数 (默认: 5)
- `delay`: 批次间延迟 (毫秒, 默认: 500)

**响应格式 (NDJSON)**:
```json
{"type":"start","sourceId":"weibo","name":"微博热搜","timestamp":1703980800000}
{"type":"data","sourceId":"weibo","index":0,"data":[...],"count":5}
{"type":"data","sourceId":"weibo","index":5,"data":[...],"count":5}
{"type":"end","sourceId":"weibo","total":20,"timestamp":1703980801000}
{"type":"error","sourceId":"baidu","message":"请求失败"}
```

### 4. 优化的批量 API

```
GET /api/v1/optimized/batch
GET /api/v1/optimized/batch?sources=weibo,zhihu,baidu&priority=high&concurrency=5
```

**查询参数**:
- `sources`: 逗号分隔的数据源ID
- `priority`: 优先级 (high, medium, low)
- `concurrency`: 并发数 (1-10)
- `timeout`: 超时时间 (毫秒)
- `limit`: 每个源的条目限制

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "optimization": {
    "priority": "high",
    "concurrency": 5,
    "timeout": 30000,
    "strategy": "priority-queue"
  },
  "summary": {
    "total": 3,
    "success": 3,
    "failed": 0,
    "avgResponseTime": "450ms"
  },
  "results": [
    {
      "id": "weibo",
      "name": "微博热搜",
      "success": true,
      "data": [...],
      "count": 10
    }
  ]
}
```

## 图片生成

### 1. 生成卡片图片

```
GET /api/v1/sources/:id/image
GET /api/v1/sources/:id/image?style=dark&limit=10
```

**查询参数**:
- `style`: 样式 (light, dark, minimal)
- `limit`: 显示条目数 (默认: 10)
- `format`: 输出格式 (png, jpeg, 默认: png)

**响应**: 图片二进制数据

### 2. 批量生成图片

```
POST /api/v1/sources/image/batch
```

**请求体**:
```json
{
  "sources": ["weibo", "baidu"],
  "style": "dark",
  "limit": 10
}
```

**响应**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": {
    "weibo": "data:image/png;base64,...",
    "baidu": "data:image/png;base64,..."
  }
}
```

## 订阅和 RSS

### 1. RSS 订阅

```
GET /api/v1/sources/:id/rss
GET /api/v1/sources/:id/rss?limit=20
```

**查询参数**:
- `limit`: 条目数量 (默认: 20)

**响应**: XML 格式的 RSS feed

### 2. 批量 RSS

```
GET /api/v1/sources/rss/batch
GET /api/v1/sources/rss/batch?ids=weibo,baidu
```

**响应**: 包含多个源的 RSS 聚合

## 监控和健康

### 1. 系统指标

```
GET /api/v1/metrics
GET /api/v1/metrics?detailed=true
```

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "health": {
    "status": "healthy",
    "uptime": "2d 5h",
    "errorRate": "2.5%",
    "message": "系统运行正常"
  },
  "summary": {
    "totalRequests": 1250,
    "totalErrors": 31,
    "avgResponseTime": "45ms",
    "cacheHitRate": "78.50%"
  }
}
```

### 2. 健康检查

```
GET /api/v1/metrics/health
```

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "status": "healthy",
  "checks": {
    "数据库": { "status": true },
    "缓存": { "status": true },
    "API": { "status": true }
  }
}
```

### 3. 性能分析

```
GET /api/v1/metrics/profiler
```

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "summary": {
    "totalCalls": 500,
    "successRate": "98.00%",
    "avgDuration": "52ms"
  },
  "slowestCalls": [
    { "function": "fetchWeibo", "duration": 1250 }
  ]
}
```

### 4. 错误日志

```
GET /api/v1/errors
GET /api/v1/errors?source=weibo&limit=10
```

**查询参数**:
- `source`: 数据源ID (可选)
- `limit`: 返回数量 (默认: 10)
- `since`: 时间戳 (毫秒, 可选)

**响应示例**:
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "data": [
    {
      "id": "err_123",
      "sourceId": "weibo",
      "timestamp": 1703980700000,
      "error": "网络超时",
      "statusCode": 504,
      "retryCount": 3
    }
  ]
}
```

## 旧版 API (兼容)

### 1. 获取热点列表 (旧版)

```
GET /api/hot-list
GET /api/hot-list?id=weibo&refresh=true
```

**注意**: 已标记为 deprecated，建议迁移到 `/api/v1/sources/:id/hot`

### 2. 获取最新数据 (旧版)

```
GET /api/latest
```

**注意**: 已标记为 deprecated，建议使用 `/api/v1/sources/hot/batch`

### 3. 代理图片

```
GET /api/proxy/img.png?url=...
```

**注意**: 用于绕过跨域限制，建议使用新的图片 API

## 错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| `SOURCE_NOT_FOUND` | 404 | 数据源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `NETWORK_ERROR` | 502 | 网络请求失败 |
| `PARSE_ERROR` | 500 | 数据解析失败 |
| `CACHE_MISS` | 404 | 缓存未命中 |
| `RATE_LIMITED` | 429 | 请求频率限制 |
| `TIMEOUT` | 504 | 请求超时 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 认证和限流

### API Key (可选)

```bash
# 在请求头中添加
Authorization: Bearer YOUR_API_KEY
```

### 速率限制

- **默认限制**: 每分钟 60 次请求
- **批量 API**: 每分钟 20 次请求
- **监控 API**: 每分钟 120 次请求

**响应头**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1703980860
```

## 使用示例

### JavaScript/TypeScript

```typescript
// 获取单个数据源
const response = await fetch('/api/v1/sources/weibo/hot');
const data = await response.json();

// 批量获取
const batch = await fetch('/api/v1/sources/hot/batch?ids=weibo,baidu,zhihu&limit=5');
const result = await batch.json();

// 流式获取
const stream = await fetch('/api/v1/sources/hot/stream?ids=weibo,baidu');
const reader = stream.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = new TextDecoder().decode(value).split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      const event = JSON.parse(line);
      console.log(event);
    }
  });
}
```

### Python

```python
import requests
import json

# 获取数据源列表
response = requests.get('http://localhost:3000/api/v1/sources')
sources = response.json()

# 获取热点数据
response = requests.get('http://localhost:3000/api/v1/sources/weibo/hot')
data = response.json()

# 批量获取
params = {'ids': 'weibo,baidu', 'limit': 10}
response = requests.get('http://localhost:3000/api/v1/sources/hot/batch', params=params)
batch = response.json()
```

### cURL

```bash
# 获取数据源列表
curl http://localhost:3000/api/v1/sources

# 获取单个数据源热点
curl http://localhost:3000/api/v1/sources/weibo/hot

# 批量获取
curl "http://localhost:3000/api/v1/sources/hot/batch?ids=weibo,baidu&limit=5"

# 流式获取
curl "http://localhost:3000/api/v1/sources/hot/stream?ids=weibo,baidu"

# 生成图片
curl http://localhost:3000/api/v1/sources/weibo/image -o weibo.png

# 获取监控指标
curl http://localhost:3000/api/v1/metrics?detailed=true
```

## 最佳实践

### 1. 缓存策略

```typescript
// 客户端缓存
const cacheKey = 'weibo-data';
const cached = localStorage.getItem(cacheKey);

if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < 120000) {
    return data; // 使用缓存
  }
}

// 重新获取
const fresh = await fetch('/api/v1/sources/weibo/hot');
const result = await fresh.json();
localStorage.setItem(cacheKey, JSON.stringify({
  data: result.data,
  timestamp: Date.now()
}));
```

### 2. 错误处理

```typescript
try {
  const response = await fetch('/api/v1/sources/weibo/hot', {
    timeout: 10000
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
} catch (error) {
  // 降级到缓存或空数据
  console.error('API Error:', error);
  return { items: [] };
}
```

### 3. 批量优化

```typescript
// 并行请求
const sources = ['weibo', 'baidu', 'zhihu'];
const results = await Promise.allSettled(
  sources.map(id =>
    fetch(`/api/v1/sources/${id}/hot?limit=5`)
      .then(r => r.json())
  )
);

// 处理结果
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

### 4. 流式处理

```typescript
// 逐步更新 UI
const stream = await fetch('/api/v1/sources/hot/stream?ids=weibo,baidu');
const reader = stream.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = new TextDecoder().decode(value).split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;

    const event = JSON.parse(line);

    if (event.type === 'data') {
      // 立即显示新数据
      updateUI(event.sourceId, event.data);
    }
  }
}
```

## 迁移指南

### 从旧版 API 迁移

**旧版**:
```typescript
const data = await $fetch('/api/hot-list?id=weibo');
```

**新版**:
```typescript
const data = await $fetch('/api/v1/sources/weibo/hot');
```

**旧版**:
```typescript
const batch = await $fetch('/api/latest');
```

**新版**:
```typescript
const batch = await $fetch('/api/v1/sources/hot/batch?ids=weibo,baidu,zhihu');
```

## 性能优化建议

1. **使用批量 API**: 减少请求次数
2. **启用缓存**: 避免重复请求
3. **流式获取**: 提升用户体验
4. **设置合理的超时**: 避免长时间等待
5. **监控指标**: 及时发现性能问题
