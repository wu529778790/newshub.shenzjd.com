# GitHub Action 自动保存热榜需求文档

## 📋 需求概述

实现一个定时自动抓取各平台热榜数据，并以 Markdown 格式保存到 GitHub 仓库的自动化系统。

**优先级**: 中
**预计开发时间**: 2-3 小时
**维护成本**: 低（基于现有架构）

---

## 🎯 核心功能

### 1. 定时数据收集
- [ ] 支持多平台热榜数据抓取
- [ ] 可配置抓取频率（实时/热点/新闻类）
- [ ] 自动重试机制（3次）
- [ ] 错误隔离（单源失败不影响其他）

### 2. 数据存储
- [ ] 按日期保存为 Markdown 格式
- [ ] 保存最新快照（latest.md）
- [ ] 月度归档（archive/2024-12.md）
- [ ] 统计信息（stats.json）

### 3. GitHub Actions 自动化
- [ ] 主工作流（实时+热点，每2小时）
- [ ] 新闻工作流（每12小时）
- [ ] 手动触发支持
- [ ] 自动提交和推送

### 4. 数据格式化
- [ ] Markdown 表格格式
- [ ] 包含排名、标题、链接、额外信息
- [ ] 时间戳和生成时间
- [ ] 差异检测（可选）

---

## 📂 目录结构

```
.github/
├── workflows/
│   ├── hotlist-collect.yml          # 主收集工作流
│   └── hotlist-news.yml             # 新闻类工作流
scripts/
├── collect-hotlist.js               # 数据收集主脚本
├── format-markdown.js               # Markdown 格式化
├── detect-changes.js                # 差异检测（可选）
└── utils/
    ├── api-client.js                # API 客户端封装
    └── file-manager.js              # 文件管理工具
data/
└── hotlist/
    ├── 2024-12-30-1400.md           # 按时间快照
    ├── latest.md                    # 最新快照
    ├── archive/
    │   └── 2024-12.md              # 月度归档
    └── stats.json                   # 统计信息
docs/
└── 未实现需求/
    └── GitHub-Action-自动保存热榜.md  # 本文档
```

---

## 🔧 技术实现

### 数据源选择

基于 `shared/pre-sources.ts` 配置：

**实时类（每2小时）**:
- `weibo` - 微博热搜
- `xueqiu-hotstock` - 雪球热门股票
- `gelonghui` - 格隆汇事件

**热点类（每6小时）**:
- `baidu` - 百度热搜
- `zhihu` - 知乎热榜
- `bilibili-hot-search` - B站热搜
- `hackernews` - Hacker News
- `github-trending-today` - GitHub Trending

**新闻类（每12小时）**:
- `thepaper` - 澎湃新闻
- `cankaoxiaoxi` - 参考消息

### API 调用

使用现有批量 API：
```
GET /api/v1/batch?sources=weibo,zhihu,baidu&limit=20
```

### Markdown 输出格式

```markdown
# 🔥 热点热榜 - 2024/12/30 14:00:00

> 生成时间: 2024-12-30T14:00:00.000Z

## 微博热搜

| 排名 | 标题 | 热度/备注 |
|------|------|----------|
| 1 | 某某事件 [链接](https://...) | 热度: 1234567 |
| 2 | 某某话题 [链接](https://...) | 热度: 987654 |

---

## 知乎热榜

| 排名 | 标题 | 热度/备注 |
|------|------|----------|
| 1 | 如何评价... [链接](https://...) | 12345 万热度 |

---
```

---

## ⚙️ 配置参数

### 环境变量
```bash
# 收集配置
COLLECT_SOURCES=weibo,zhihu,baidu,bilibili-hot-search,hackernews,github-trending-today
LIMIT=20
API_TIMEOUT=30000
RETRY_TIMES=3

# GitHub 配置
GIT_COMMIT_MESSAGE=chore: update hotlist data
DATA_RETENTION_DAYS=90
```

### 触发频率
- **实时类**: `0 */2 * * *` (每2小时)
- **热点类**: `0 */6 * * *` (每6小时)
- **新闻类**: `0 */12 * * *` (每12小时)

---

## 📊 预期效果

### 执行流程
```
GitHub Actions 定时触发
    ↓
启动 Nitro 服务 (pnpm start)
    ↓
调用 /api/v1/batch 获取数据
    ↓
格式化为 Markdown
    ↓
保存到 data/hotlist/
    ↓
Git 提交并推送
```

### 仓库数据结构
```
data/hotlist/
├── 2024-12-30-1400.md    # 14:00 快照
├── 2024-12-30-1600.md    # 16:00 快照
├── 2024-12-30-1800.md    # 18:00 快照
├── latest.md             # 最新快照
├── stats.json            # 统计信息
└── archive/
    ├── 2024-11.md        # 11月归档
    └── 2024-12.md        # 12月归档
```

---

## 🎯 优势特点

1. **基于现有架构**: 直接复用项目 API，无需额外开发
2. **增量更新**: 只保存变化的数据，节省存储
3. **错误容错**: 单源失败不影响整体
4. **历史追踪**: 完整历史支持趋势分析
5. **GitHub 原生**: 无需额外基础设施
6. **可扩展**: 易于添加新数据源

---

## 📝 实现步骤

### 阶段 1: 准备工作
- [ ] 创建 `scripts/` 目录结构
- [ ] 编写 API 客户端封装
- [ ] 编写文件管理工具

### 阶段 2: 核心脚本
- [ ] 实现 `collect-hotlist.js` 数据收集
- [ ] 实现 `format-markdown.js` 格式化
- [ ] 实现 `detect-changes.js` 差异检测（可选）

### 阶段 3: GitHub Action
- [ ] 创建主工作流文件
- [ ] 创建新闻类工作流文件
- [ ] 配置环境变量和 secrets

### 阶段 4: 测试和优化
- [ ] 本地测试脚本功能
- [ ] 手动触发 Action 验证
- [ ] 优化性能和错误处理

---

## 🔍 关键文件路径

| 文件 | 说明 |
|------|------|
| `.github/workflows/hotlist-collect.yml` | 主工作流 |
| `.github/workflows/hotlist-news.yml` | 新闻工作流 |
| `scripts/collect-hotlist.js` | 数据收集脚本 |
| `scripts/format-markdown.js` | 格式化脚本 |
| `scripts/utils/api-client.js` | API 客户端 |
| `scripts/utils/file-manager.js` | 文件管理 |
| `data/hotlist/` | 数据存储目录 |

---

## 🚀 后续优化方向

1. **数据可视化**: 生成图表展示趋势
2. **智能分析**: 识别热点趋势和异常
3. **RSS 输出**: 提供 RSS 订阅
4. **多仓库支持**: 推送到独立的数据仓库
5. **Webhook 通知**: 数据更新时通知

---

## 📌 注意事项

1. **服务器启动**: GitHub Actions 需要先启动 Nitro 服务才能调用 API
2. **超时设置**: 建议设置 15 分钟超时，避免长时间运行
3. **存储限制**: GitHub 仓库有存储限制，需要定期清理旧数据
4. **API 限流**: 注意目标网站的反爬虫策略
5. **网络稳定性**: 考虑网络不稳定时的重试机制

---

**创建时间**: 2024-12-30
**状态**: 待实现
**优先级**: 中
