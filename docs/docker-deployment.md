# Docker 部署指南

## 🚀 快速开始

### 1. 拉取镜像

```bash
# 从 GitHub Container Registry 拉取
docker pull ghcr.io/wu529778790/newshub.shenzjd.com:latest

# 或者从 Docker Hub 拉取
docker pull wu529778790/newshub.shenzjd.com:latest
```

### 2. 使用 Docker Compose 运行

```bash
# 创建数据目录
mkdir -p ./data

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f newshub
```

### 3. 或者使用 Docker 命令运行

```bash
# 创建数据目录
mkdir -p ./data

# 运行容器
docker run -d \
  --name newshub \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  ghcr.io/wu529778790/newshub.shenzjd.com:latest

# 查看日志
docker logs -f newshub
```

## 🔍 故障排查

### 问题 1: 容器启动但无法访问

**检查容器状态:**
```bash
docker ps
docker inspect newshub
```

**检查容器日志:**
```bash
docker logs newshub
```

**预期输出:**
```
✅ Server listening on port 3000
🚀 Ready for traffic!
```

**手动测试:**
```bash
curl http://localhost:3000/api/v1/sources
```

### 问题 2: 健康检查失败

**检查健康状态:**
```bash
docker ps --filter "name=newshub"
```

**如果健康检查失败，检查:**
1. 容器是否在运行: `docker ps`
2. 日志是否有错误: `docker logs newshub`
3. 端口是否被占用: `netstat -ano | findstr :3000`

### 问题 3: 数据源无法加载

**检查数据源状态:**
```bash
curl http://localhost:3000/api/v1/sources/hackernews
curl http://localhost:3000/api/v1/sources/producthunt
curl http://localhost:3000/api/v1/sources/eastmoney
```

**查看所有数据源:**
```bash
curl http://localhost:3000/api/v1/sources
```

### 问题 4: 权限问题

**如果遇到 EACCES 错误:**
```bash
# 检查 data 目录权限
ls -la ./data

# 修复权限（如果在 Linux 上）
sudo chown -R 1001:1001 ./data

# 或者删除并重新创建
rm -rf ./data
mkdir -p ./data
```

### 问题 5: 内存不足

**检查容器资源使用:**
```bash
docker stats newshub
```

**增加内存限制:**
```bash
docker run -d \
  --memory=512m \
  --memory-swap=1g \
  ...其他参数
```

## 📊 监控

### 查看实时日志
```bash
docker logs -f newshub --tail 100
```

### 查看容器统计
```bash
docker stats newshub
```

### 检查健康状态
```bash
docker inspect --format='{{.State.Health.Status}}' newshub
```

## 🔄 更新部署

### 1. 拉取最新镜像
```bash
docker pull ghcr.io/wu529778790/newshub.shenzjd.com:latest
```

### 2. 重启容器
```bash
docker-compose down
docker-compose up -d
```

### 3. 或者使用滚动更新
```bash
docker-compose pull
docker-compose up -d --no-deps newshub
```

## 🔧 环境变量配置

| 变量名 | 说明 | 默认值 | 是否必需 |
|--------|------|--------|----------|
| `NODE_ENV` | 运行环境 | `production` | 推荐 |
| `PORT` | 服务端口 | `3000` | 可选 |
| `SITE_URL` | 站点 URL | `http://localhost:3000` | 可选 |
| `API_SECRET` | API 密钥 | 无 | 可选 |
| `CACHE_DURATION` | 缓存时间(毫秒) | `600000` (10分钟) | 可选 |
| `MAX_RETRIES` | 最大重试次数 | `3` | 可选 |

## 🐳 Docker Hub 镜像

- **仓库**: `wu529778790/newshub.shenzjd.com`
- **标签**:
  - `latest` - 最新版本
  - `v0.0.2` - 特定版本
  - `main` - 主分支最新

## 🌐 GitHub Container Registry

- **仓库**: `ghcr.io/wu529778790/newshub.shenzjd.com`
- **标签**: 同上

## 📝 部署示例

### 服务器部署 (VPS)

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. 创建项目目录
mkdir -p /opt/newshub/data
cd /opt/newshub

# 3. 下载 docker-compose.yml
wget https://raw.githubusercontent.com/wu529778790/newshub.shenzjd.com/main/docker-compose.yml

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f
```

### 云平台部署

#### Railway
```bash
# 1. 连接 GitHub 仓库
# 2. 设置环境变量
# 3. Railway 会自动构建和部署
```

#### Fly.io
```bash
# 1. 安装 flyctl
# 2. 创建应用
flyctl launch

# 3. 部署
flyctl deploy
```

## 🎯 验证部署

部署完成后，访问以下 URL 验证服务是否正常:

1. **主页**: `http://your-server:3000`
2. **API 健康检查**: `http://your-server:3000/api/v1/sources`
3. **单个数据源**: `http://your-server:3000/api/v1/sources/hackernews`

## 📞 获取帮助

如果遇到问题:

1. 查看容器日志: `docker logs newshub`
2. 检查配置: `docker exec newshub env`
3. 查看文档: 本项目 README.md
4. 提交 Issue: GitHub Issues

## ✅ 成功标志

部署成功的标志:

- ✅ 容器状态为 `Up`
- ✅ 健康检查为 `healthy`
- ✅ 访问 `http://localhost:3000` 显示页面
- ✅ API 返回数据
- ✅ 日志显示 "Server listening on port 3000"
