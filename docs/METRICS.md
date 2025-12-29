# 监控和可观测性系统

## 概述

系统提供了完整的监控和可观测性解决方案，包括性能指标、健康检查、性能分析和调用追踪。

## 核心组件

### 1. MetricsManager - 指标管理器

**功能：**
- 请求计数和错误率统计
- 响应时间（平均值、P95、P99）
- 数据源成功率和性能
- 缓存命中率
- 系统资源使用（内存、运行时间）

**使用示例：**
```typescript
import { metrics } from '~/server/utils/metrics';

// 记录请求
const requestMetrics = metrics.recordRequestStart('weibo');
try {
  const data = await fetchWeibo();
  metrics.recordRequestEnd(requestMetrics);
} catch (error) {
  metrics.recordRequestEnd(requestMetrics, error);
}

// 记录缓存
metrics.recordCacheHit();  // 缓存命中
metrics.recordCacheMiss(); // 缓存未命中

// 获取指标
const currentMetrics = metrics.getMetrics();
const health = metrics.getHealth();
```

### 2. Profiler - 性能分析器

**功能：**
- 代码执行时间分析
- 内存使用追踪
- 嵌套性能分析
- 阈值告警

**使用示例：**
```typescript
import { Profiler } from '~/server/utils/profiler';

// 基本用法
const id = Profiler.start('数据抓取');
try {
  const data = await fetchData();
} finally {
  const profile = Profiler.end(id);
}

// 包装函数（推荐）
const data = await Profiler.profile('数据抓取', async () => {
  return await fetchData();
}, { threshold: 100 });

// 同步版本
const result = Profiler.profileSync('数据处理', () => {
  return processData();
});
```

### 3. CallTracer - 调用追踪器

**功能：**
- 函数调用记录
- 成功率统计
- 最慢调用识别

**使用示例：**
```typescript
import { CallTracer } from '~/server/utils/profiler';

// 自动追踪
const data = await CallTracer.trace('fetchData', async () => {
  return await fetchData();
});

// 获取统计
const stats = CallTracer.getStats();
// { totalCalls: 100, successRate: 95, avgDuration: 50, slowestCalls: [...] }
```

### 4. HealthCheckManager - 健康检查

**功能：**
- 注册自定义健康检查
- 定期运行检查
- 整体健康状态

**使用示例：**
```typescript
import { healthCheck } from '~/server/utils/metrics';

// 注册检查
healthCheck.register('数据库', async () => {
  return await checkDatabaseConnection();
});

healthCheck.register('缓存', async () => {
  return await checkCacheHealth();
});

// 运行检查
const results = await healthCheck.runAll();
const isHealthy = healthCheck.getOverallHealth();
```

### 5. 装饰器

**自动性能分析：**
```typescript
import { Profiled, Traced, Monitored } from '~/server/utils/profiler';
import { Monitored as MetricsMonitored } from '~/server/utils/metrics';

class DataService {
  @Profiled({ threshold: 50 })
  @MetricsMonitored
  async getHotList(sourceId: string) {
    // 自动记录性能和指标
  }

  @Traced
  async fetchData() {
    // 自动追踪调用
  }
}
```

## API 端点

### 1. 获取系统指标

```
GET /api/v1/metrics
GET /api/v1/metrics?detailed=true
```

**响应示例：**
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
    "errorRate": "2.48%",
    "avgResponseTime": "45ms",
    "cacheHitRate": "78.50%",
    "uptime": "2d 5h 23m"
  }
}
```

### 2. 健康检查

```
GET /api/v1/metrics/health
```

**响应示例：**
```json
{
  "apiVersion": "1.0",
  "timestamp": 1703980800000,
  "status": "healthy",
  "system": {
    "status": "healthy",
    "uptime": "2d 5h",
    "errorRate": "2.5%",
    "message": "系统运行正常"
  },
  "checks": {
    "数据库": { "status": true },
    "缓存": { "status": true },
    "API": { "status": true }
  },
  "metadata": {
    "totalChecks": 3,
    "passed": 3,
    "failed": 0
  }
}
```

### 3. 性能分析数据

```
GET /api/v1/metrics/profiler
```

**响应示例：**
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
    { "function": "fetchWeibo", "duration": 1250 },
    { "function": "fetchBaidu", "duration": 890 }
  ]
}
```

## 监控最佳实践

### 1. 关键指标阈值

| 指标 | 健康 | 警告 | 严重 |
|------|------|------|------|
| 错误率 | < 5% | 5-20% | > 20% |
| 平均响应时间 | < 100ms | 100-500ms | > 500ms |
| P95响应时间 | < 500ms | 500-2000ms | > 2000ms |
| 缓存命中率 | > 70% | 50-70% | < 50% |

### 2. 告警策略

```typescript
import { metrics } from '~/server/utils/metrics';

// 定期检查并告警
setInterval(() => {
  const health = metrics.getHealth();

  if (health.status === 'unhealthy') {
    // 发送告警通知
    sendAlert('系统健康状态异常', health.message);
  }

  if (health.errorRate > 0.1) {
    // 错误率过高告警
    sendAlert('错误率过高', `${(health.errorRate * 100).toFixed(2)}%`);
  }
}, 60000); // 每分钟检查一次
```

### 3. 性能优化建议

**基于监控数据的优化：**

1. **响应时间过长**
   - 使用 `@Profiled` 找出慢函数
   - 检查数据源性能
   - 优化缓存策略

2. **缓存命中率低**
   - 调整 TTL
   - 增加缓存大小
   - 预热常用数据

3. **错误率高**
   - 检查数据源可用性
   - 增加重试次数
   - 实现降级策略

### 4. 数据保留策略

```typescript
// 在 MetricsManager 中实现
private cleanupOldMetrics(): void {
  // 保留最近 24 小时的数据
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  this.responseTimes = this.responseTimes.filter(t => t > cutoff);
}
```

## 集成示例

### 在数据源中使用

```typescript
import { metrics } from '~/server/utils/metrics';
import { Profiler } from '~/server/utils/profiler';

export async function getWeiboHotList(): Promise<NewsItem[]> {
  const requestMetrics = metrics.recordRequestStart('weibo');

  try {
    const data = await Profiler.profile('weibo-fetch', async () => {
      const rawData = await myFetch('https://weibo.com/hot');
      return parseWeiboData(rawData);
    }, { threshold: 100 });

    metrics.recordRequestEnd(requestMetrics);
    return data;
  } catch (error) {
    metrics.recordRequestEnd(requestMetrics, error);
    throw error;
  }
}
```

### 在 API 中使用

```typescript
import { metrics } from '~/server/utils/metrics';
import { CallTracer } from '~/server/utils/profiler';

export default defineEventHandler(async (event) => {
  const start = Date.now();

  try {
    const result = await CallTracer.trace('api-batch', async () => {
      // 处理逻辑
    });

    return result;
  } catch (error) {
    // 错误会自动记录
    throw error;
  }
});
```

## 监控仪表板

可以使用以下工具构建监控仪表板：

1. **Grafana + Prometheus** - 专业监控
2. **自定义前端** - 简单监控
3. **日志分析** - ELK Stack

### 自定义仪表板示例

```vue
<template>
  <div>
    <h2>系统监控</h2>
    <div>错误率: {{ metrics.errorRate }}</div>
    <div>平均响应时间: {{ metrics.avgResponseTime }}ms</div>
    <div>缓存命中率: {{ metrics.cacheHitRate }}%</div>
  </div>
</template>

<script setup>
const { data: metrics } = await useFetch('/api/v1/metrics?detailed=true');
</script>
```

## 性能影响

监控系统对性能的影响：

- **MetricsManager**: < 1ms 每次调用
- **Profiler**: 1-5ms 每次分析
- **CallTracer**: < 1ms 每次调用
- **HealthCheck**: 依赖检查逻辑，通常 < 100ms

**建议：**
- 生产环境：开启所有监控
- 开发环境：按需开启 Profiler
- 高负载场景：采样记录（例如只记录 10% 的请求）

## 故障排查

### 问题：指标不准确

**解决方案：**
1. 检查是否正确调用 `recordRequestStart` 和 `recordRequestEnd`
2. 确保在所有代码路径中都调用 `recordRequestEnd`
3. 使用 `@Monitored` 装饰器自动处理

### 问题：性能分析过慢

**解决方案：**
1. 增加 `threshold` 参数
2. 只在关键路径使用 Profiler
3. 生产环境采样使用

### 问题：健康检查失败

**解决方案：**
1. 检查检查函数的实现
2. 验证依赖服务是否可用
3. 调整检查频率
