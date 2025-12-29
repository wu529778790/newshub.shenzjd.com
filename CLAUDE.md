# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个**热点内容聚合器**，从多个平台（微博、知乎、百度、Bilibili 等）抓取热门数据，提供统一的浏览界面。支持拖拽排序、图片分享、数据缓存等功能。

**技术栈：**
- **前端**: Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS + DaisyUI
- **后端**: Nitro Server API (Node.js)
- **数据抓取**: 自定义 fetch 工具 + HTML 解析
- **图片生成**: HTML2Canvas + Canvas API
- **存储**: 内存缓存（可选持久化）

## 目录结构

```
newshub.shenzjd.com/
├── server/                          # 后端 API 和数据抓取
│   ├── api/                         # API 端点
│   │   ├── hot/[source].ts          # 各平台热点数据
│   │   ├── image/[source].ts        # 图片生成端点
│   │   └── ...
│   ├── utils/                       # 工具函数
│   │   ├── fetch.ts                 # 增强的 fetch（带缓存）
│   │   ├── date.ts                  # 日期解析工具
│   │   ├── rss2json.ts              # RSS 转 JSON
│   │   ├── source.ts                # 数据源定义
│   │   └── ...
│   └── sources/                     # 27+ 数据源实现
│       ├── baidu.ts                 # 百度热搜
│       ├── weibo.ts                 # 微博热搜
│       ├── zhihu.ts                 # 知乎热榜
│       ├── bilibili.ts              # B站热门
│       └── ... (45+ files)
├── pages/                           # 前端页面
│   ├── index.vue                    # 主页面（拖拽 + 卡片展示）
│   └── components/                  # Vue 组件
│       ├── HotListCard.vue          # 热点卡片（含图片生成）
│       └── ...
├── shared/                          # 共享类型和配置
│   ├── metadata.ts                  # 栏目元数据
│   ├── pre-sources.ts               # 数据源预定义
│   ├── types.ts                     # TypeScript 类型
│   └── ...
├── public/                          # 静态资源
├── data/                            # 数据存储（可选）
├── nuxt.config.ts                   # Nuxt 配置
├── package.json                     # 项目依赖
└── Dockerfile                       # Docker 部署
```

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式（http://localhost:3000）
pnpm build            # 构建生产版本
pnpm preview          # 预览生产构建
pnpm generate         # 生成静态站点
pnpm type-check       # TypeScript 类型检查
```

## 核心架构

### 1. 数据抓取层 (server/sources/)

每个数据源都是独立的异步函数，返回标准化的 `NewsItem[]`：

```typescript
export async function getBaiduHotList(): Promise<NewsItem[]> {
  const rawData = await myFetch(`https://top.baidu.com/board?tab=realtime`);
  const jsonStr = (rawData as string).match(/<!--s-data:(.*?)-->/s);
  const data: BaiduResponse = JSON.parse(jsonStr[1]);

  return data.data.cards[0].content.map((item, index) => ({
    id: item.rawUrl,
    title: item.word,
    url: item.rawUrl,
    extra: { info: `排名: ${index + 1}` }
  }));
}
```

**数据源类型：**
- **实时类**: 微博、抖音、B站（2-5 分钟刷新）
- **热点类**: 百度、知乎、虎扑（10 分钟刷新）
- **新闻类**: 澎湃新闻、参考消息（30 分钟刷新）

### 2. 缓存系统 (server/utils/fetch.ts)

```typescript
// 内存缓存 + 节流控制
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 分钟

export async function myFetch(url: string, options: FetchOptions = {}) {
  // 1. 检查缓存
  // 2. 发起请求（带 User-Agent 伪装）
  // 3. 错误重试机制
  // 4. 更新缓存
}
```

### 3. API 端点

**GET /api/hot/{source}**
- 返回指定平台的热点数据
- 自动缓存，支持 `?force=1` 强制刷新

**GET /api/image/{source}**
- 生成热点列表的分享图片
- 使用 Canvas 绘制自定义样式

**GET /api/rss/{source}**
- 提供 RSS 订阅格式

### 4. 前端架构 (pages/index.vue)

```vue
<template>
  <draggable v-model="sources" handle=".drag-handle">
    <HotListCard
      v-for="source in sources"
      :key="source.id"
      :source="source"
      :items="hotItemsBySource[source.id]"
    />
  </draggable>
</template>

<script setup>
// 1. 加载用户排序配置（localStorage）
// 2. 并行请求所有数据源
// 3. IntersectionObserver 懒加载
// 4. HTML2Canvas 生成分享图
</script>
```

### 5. 图片生成 (HotListCard.vue)

**三级降级策略：**
1. **HTML2Canvas**: 截取 DOM（可能跨域失败）
2. **自定义 Canvas**: 手动绘制卡片（推荐）
3. **纯色背景**: 仅显示文字和二维码

```typescript
// 自定义 Canvas 绘制
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 绘制背景、标题、排名、边框
ctx.fillStyle = '#07C160';
ctx.fillRect(0, 0, width, height);

// 绘制文字
ctx.font = 'bold 24px sans-serif';
ctx.fillStyle = '#333';
ctx.fillText(item.title, 20, 50 + i * 60);
```

## 关键配置

### 环境变量（.env）

```bash
# 可选（用于某些需要认证的源）
WECHAT_TOKEN=your-token
SITE_URL=https://your-site.com

# 缓存配置
CACHE_DURATION=600000  # 10 分钟
MAX_RETRIES=3          # 重试次数
```

### Nuxt 配置 (nuxt.config.ts)

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/daisyui'],
  nitro: {
    storage: {
      redis: { driver: 'redis', url: process.env.REDIS_URL },
    },
  },
  runtimeConfig: {
    apiSecret: process.env.API_SECRET,
  },
});
```

## 数据源列表（27+）

| 平台 | 类型 | 列 | 刷新频率 |
|------|------|----|----------|
| 微博 | 热点 | 实时热搜 | 2 分钟 |
| 知乎 | 热点 | 热榜 | 10 分钟 |
| 百度 | 热点 | 实时榜 | 10 分钟 |
| B站 | 热点 | 热门视频 | 5 分钟 |
| 抖音 | 热点 | 热门 | 10 分钟 |
| 虎扑 | 热点 | 主干道 | 10 分钟 |
| 贴吧 | 热点 | 热议 | 10 分钟 |
| 今日头条 | 热点 | 热点 | 10 分钟 |
| IT之家 | 实时 | 快讯 | 5 分钟 |
| 澎湃新闻 | 热点 | 热榜 | 30 分钟 |
| 联合早报 | 实时 | 新闻 | 30 分钟 |
| 卫星通讯社 | 新闻 | - | 30 分钟 |
| 参考消息 | 新闻 | - | 30 分钟 |
| 远景论坛 | 实时 | Win11 | 5 分钟 |
| 雪球 | 热点 | 热门股票 | 2 分钟 |
| 格隆汇 | 实时 | 事件 | 2 分钟 |
| 法布财经 | 新闻 | 头条 | 30 分钟 |
| Solidot | 科技 | - | 60 分钟 |
| Github | 热点 | Trending | 30 分钟 |
| 少数派 | 热点 | - | 30 分钟 |
| 稀土掘金 | 热点 | - | 30 分钟 |
| 凤凰网 | 热点 | 资讯 | 10 分钟 |
| 金十数据 | 实时 | - | 5 分钟 |
| 华尔街见闻 | 热点/实时 | 最热/最新 | 30 分钟 |
| 36氪 | 实时 | 快讯 | 5 分钟 |
| 快手 | 热点 | - | 10 分钟 |
| V2EX | 分享 | 最新 | 30 分钟 |

## Docker 部署

### Dockerfile（多阶段构建）

```dockerfile
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

### GitHub Actions（自动发布）

```yaml
name: Docker Publish
on:
  push:
    tags: ['v*.*.*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
            ${{ secrets.DOCKER_HUB_USERNAME }}/${{ github.event.repository.name }}:${{ github.ref_name }}
```

### 部署命令

```bash
# 1. 打标签并推送
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions 自动构建 Docker 镜像

# 3. 服务器拉取并运行
docker pull ghcr.io/your/repo:v1.0.0
docker run -d \
  -p 3000:3000 \
  -e SITE_URL=https://your-site.com \
  -v /path/to/data:/app/data \
  --name newshub \
  ghcr.io/your/repo:v1.0.0
```

## 核心特性

### 1. 智能缓存
- 内存缓存，自动过期
- 节流写入，避免频繁 I/O
- 支持持久化到文件/SQLite

### 2. 错误处理
- 单源失败不影响其他源
- 自动重试机制（3 次）
- 降级返回空数组而非报错

### 3. 用户体验
- 拖拽排序（保存到 localStorage）
- 懒加载（IntersectionObserver）
- 图片分享（Canvas 绘制）
- 响应式设计（移动端友好）

### 4. 性能优化
- 并行请求所有数据源
- 缓存中间结果
- 按需加载图片
- 服务端渲染（SSR）

## 开发注意事项

### 1. 添加新数据源
在 `server/sources/` 创建文件，导出 `getXXXList()` 函数：
```typescript
// server/sources/new-platform.ts
export async function getNewPlatformList(): Promise<NewsItem[]> {
  // 实现抓取逻辑
  return items;
}

// server/api/hot/new-platform.ts
export default defineEventHandler(() => getNewPlatformList());
```

### 2. 处理反爬虫
- 使用 `myFetch()`（已配置 User-Agent）
- 添加随机延迟
- 支持代理配置

### 3. 调试工具
```bash
# 查看原始数据
curl http://localhost:3000/api/hot/baidu

# 生成图片
curl http://localhost:3000/api/image/baidu -o test.png

# 强制刷新缓存
curl http://localhost:3000/api/hot/baidu?force=1
```

### 4. 类型安全
所有数据源返回 `NewsItem[]`：
```typescript
interface NewsItem {
  id: string;          // 唯一标识（通常用 URL）
  title: string;       // 标题
  url: string;         // 原文链接
  pubDate?: string;    // 发布时间
  extra?: Record<string, string>; // 额外信息
}
```

## 常见问题

**Q: 数据源抓取失败？**
A: 检查目标网站是否更新 HTML 结构，使用浏览器开发者工具查看最新选择器

**Q: 图片生成空白？**
A: 可能是跨域问题，使用自定义 Canvas 绘制方案

**Q: 缓存不更新？**
A: 检查 `CACHE_DURATION` 配置，或使用 `?force=1` 参数

**Q: Docker 构建失败？**
A: 确保使用 `pnpm` 而非 `npm`，检查 `pnpm-lock.yaml` 是否存在

## 相关资源

- Nuxt 文档: https://nuxt.com
- Tailwind CSS: https://tailwindcss.com
- DaisyUI: https://daisyui.com
- HTML2Canvas: https://html2canvas.hertzen.com
- RSSHub: https://rsshub.app
