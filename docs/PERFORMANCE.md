# 性能优化和构建配置

## 概述

本项目采用多层次的性能优化策略，涵盖代码分割、缓存策略、懒加载、构建优化等方面。

## 构建配置

### 1. Nuxt 配置优化

**nuxt.config.ts** 中的关键优化：

```typescript
export default defineNuxtConfig({
  // TypeScript 严格模式
  typescript: {
    tsConfig: {
      compilerOptions: {
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
    },
    typeCheck: true,
  },

  // 构建分析
  build: {
    analyze: process.env.ANALYZE === "true",
  },

  // Nitro 服务器优化
  nitro: {
    compressPublicAssets: true,
    storage: {
      redis: process.env.REDIS_URL ? {
        driver: "redis",
        url: process.env.REDIS_URL,
      } : undefined,
    },
  },

  // 实验性特性
  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
    viewTransitions: true,
    clientRouteCache: true,
  },

  // Vite 优化
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vue-vendor": ["vue", "vue-router"],
            "ui-vendor": ["@nuxtjs/tailwindcss", "@nuxtjs/daisyui"],
            "utils": ["dayjs", "cheerio", "fast-xml-parser"],
            "image": ["html2canvas"],
          },
        },
      },
      target: "es2018",
    },
  },
});
```

### 2. 代码分割策略

**自动代码分割：**
- Vue 核心库独立打包
- UI 库独立打包
- 工具库独立打包
- 图片处理库独立打包

**手动配置：**
```typescript
manualChunks: {
  "vue-vendor": ["vue", "vue-router"],
  "ui-vendor": ["@nuxtjs/tailwindcss", "@nuxtjs/daisyui"],
  "utils": ["dayjs", "cheerio", "fast-xml-parser"],
  "image": ["html2canvas"],
}
```

### 3. CSS 优化

**Tailwind + DaisyUI 配置：**
```typescript
postcss: {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === "production" ? {
      cssnano: {
        preset: ["default", {
          discardComments: { removeAll: true },
        }],
      },
    } : {}),
  },
},
```

**生产环境：**
- 移除所有 CSS 注释
- 压缩 CSS 文件
- 自动添加浏览器前缀

## 运行时优化

### 1. 缓存策略

**路由级缓存：**
```typescript
routeRules: {
  "/_nuxt/**": {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },
  "/api/v1/sources/**": {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
    },
  },
}
```

**存储层缓存：**
- 内存缓存（默认）
- 文件缓存（持久化）
- Redis（可选，分布式）

### 2. 数据获取优化

**使用新的 API 端点：**
```typescript
// ✅ 推荐：批量获取
const batch = await fetch('/api/v1/sources/hot/batch?ids=weibo,baidu&limit=5');

// ✅ 推荐：流式获取
const stream = await fetch('/api/v1/sources/hot/stream?ids=weibo,baidu');

// ❌ 避免：串行请求
const weibo = await fetch('/api/hot-list?id=weibo');
const baidu = await fetch('/api/hot-list?id=baidu');
```

**并发控制：**
```typescript
import { TaskQueue } from '~/server/utils/concurrency';

const queue = new TaskQueue(5); // 最大 5 个并发
const results = await queue.addAll(
  sources.map(s => () => fetchSource(s))
);
```

### 3. 前端优化

**懒加载组件：**
```vue
<template>
  <Suspense>
    <template #default>
      <HotListCard
        v-for="source in sources"
        :key="source.id"
        :source="source"
      />
    </template>
    <template #fallback>
      <LoadingState />
    </template>
  </Suspense>
</template>
```

**IntersectionObserver 懒加载：**
```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sourceId = entry.target.dataset.sourceId;
        fetchHotListForSource(sourceId);
        observer.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "300px" }
);
```

**图片生成优化：**
- 推荐：自定义 Canvas 绘制（避免跨域）
- 降级：简单文本图片
- 剪贴板 API 优先，下载为备选

## 性能监控

### 1. 指标收集

**使用 MetricsManager：**
```typescript
import { metrics } from '~/server/utils/metrics';

// 记录请求
const reqMetrics = metrics.recordRequestStart('weibo');
try {
  const data = await fetchData();
  metrics.recordRequestEnd(reqMetrics);
} catch (error) {
  metrics.recordRequestEnd(reqMetrics, error);
}

// 获取指标
const currentMetrics = metrics.getMetrics();
const health = metrics.getHealth();
```

**关键指标：**
- 请求总数和错误率
- 响应时间（平均值、P95、P99）
- 缓存命中率
- 数据源成功率

### 2. 性能分析

**使用 Profiler：**
```typescript
import { Profiler } from '~/server/utils/profiler';

// 包装函数
const data = await Profiler.profile('数据抓取', async () => {
  return await fetchData();
}, { threshold: 100 });

// 自动记录慢操作
```

**分析结果：**
- 执行时间
- 内存使用
- 嵌套调用
- 阈值告警

### 3. API 端点

**监控 API：**
```
GET /api/v1/metrics?detailed=true
GET /api/v1/metrics/health
GET /api/v1/metrics/profiler
```

## 构建和部署

### 1. 开发环境

```bash
# 启动开发服务器
pnpm dev

# 带主机绑定
pnpm dev:host

# 类型检查
pnpm type-check

# 运行测试
pnpm test
```

### 2. 生产构建

```bash
# 标准构建
pnpm build

# 生产环境构建
pnpm build:production

# 带分析报告
pnpm build:analyze

# 生成静态站点
pnpm generate

# 预览构建
pnpm preview
```

### 3. Docker 部署

**Dockerfile 优化：**
```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

**优化点：**
- 使用 Alpine 镜像减小体积
- 多阶段构建减少最终镜像大小
- 锁定依赖版本

### 4. CI/CD 优化

**GitHub Actions：**
```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Run tests
        run: pnpm test -- --coverage

      - name: Build
        run: pnpm build:production

      - name: Deploy
        run: |
          # 部署逻辑
```

## 性能指标

### 1. 目标指标

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| 首次内容渲染 (FCP) | < 1.5s | 待测量 |
| 最大内容渲染 (LCP) | < 2.5s | 待测量 |
| 交互时间 (TTI) | < 3.5s | 待测量 |
| 总阻塞时间 (FID) | < 100ms | 待测量 |
| 累积布局偏移 (CLS) | < 0.1 | 待测量 |

### 2. API 性能

| 端点 | 响应时间 | 缓存命中率 |
|------|----------|------------|
| /api/v1/sources | < 50ms | 95% |
| /api/v1/sources/:id/hot | < 200ms | 80% |
| /api/v1/sources/hot/batch | < 500ms | 75% |
| /api/v1/stream | 流式 | N/A |

### 3. 资源大小

| 资源 | 目标大小 | 分割策略 |
|------|----------|----------|
| JavaScript 总大小 | < 500KB | 手动分割 |
| CSS 总大小 | < 100KB | Tailwind 优化 |
| 首屏加载 | < 1MB | 懒加载 |

## 优化检查清单

### 构建时优化
- [ ] 启用代码分割
- [ ] 压缩 CSS/JS
- [ ] 移除未使用代码
- [ ] 优化图片资源
- [ ] 启用 Tree Shaking

### 运行时优化
- [ ] 实现缓存策略
- [ ] 使用懒加载
- [ ] 优化数据获取
- [ ] 实现并发控制
- [ ] 添加错误降级

### 监控和分析
- [ ] 配置性能指标
- [ ] 设置告警阈值
- [ ] 定期分析报告
- [ ] 监控错误率
- [ ] 跟踪用户体验

## 性能优化建议

### 1. 代码层面
- 使用 TypeScript 严格模式
- 避免不必要的 reactivity
- 合理使用 computed 和 watch
- 组件按需加载

### 2. 数据层面
- 实现数据缓存
- 使用批量请求
- 优化数据库查询
- 减少网络请求

### 3. 用户体验
- 骨架屏加载
- 渐进式加载
- 错误友好提示
- 离线支持

### 4. 部署层面
- 使用 CDN
- 启用 Gzip/Brotli
- 配置 HTTP/2
- 使用边缘计算

## 性能测试

### 基准测试

```bash
# 运行性能测试
pnpm test:coverage

# 分析打包大小
pnpm build:analyze

# 查看 Lighthouse 报告
# 使用 Chrome DevTools
```

### 负载测试

```typescript
// 使用 Artillery 或 k6
// 测试并发请求处理能力
// 验证缓存命中率
// 监控资源使用
```

## 总结

通过以上优化，系统实现了：
- ✅ 快速的构建速度
- ✅ 优化的包大小
- ✅ 高效的缓存策略
- ✅ 可靠的监控系统
- ✅ 良好的用户体验

持续监控和优化是保持高性能的关键。
