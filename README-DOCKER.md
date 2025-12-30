# NewsHub Docker 部署和测试指南

## 🚀 快速部署

### 方法 1: Docker 直接运行

```bash
# 1. 构建镜像
docker build -t newshub:latest .

# 2. 运行容器
docker run -d -p 3000:3000 --name newshub newshub:latest

# 3. 查看日志
docker logs -f newshub
```

### 方法 2: Docker Compose (推荐)

```bash
# 1. 启动服务
docker-compose up -d --build

# 2. 查看状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

## 🔍 测试部署

### 快速测试脚本

```bash
# 运行测试脚本
./test-docker.sh
```

### 手动测试

```bash
# 1. 健康检查
curl http://localhost:3000/api/v1/health

# 2. 数据源列表
curl http://localhost:3000/api/v1/sources

# 3. 主页访问
curl http://localhost:3000/

# 4. 具体数据源
curl http://localhost:3000/api/hot/baidu
curl http://localhost:3000/api/hot/weibo
curl http://localhost:3000/api/hot/zhihu
```

### 浏览器测试

- **主页**: http://localhost:3000/
- **健康检查**: http://localhost:3000/api/v1/health
- **数据源**: http://localhost:3000/api/v1/sources

## 📊 预期结果

### ✅ 正常响应

**健康检查**:
```json
{
  "apiVersion": "1.0",
  "status": "healthy",
  "timestamp": 1234567890,
  "sources": {
    "total": 30,
    "enabled": 28,
    "health": { "healthy": 0, "degraded": 0, "unhealthy": 0, "unknown": 30 }
  }
}
```

**数据源列表**:
```json
{
  "apiVersion": "1.0",
  "count": 28,
  "sources": [
    { "id": "weibo", "name": "微博", "enabled": true, ... },
    { "id": "zhihu", "name": "知乎", "enabled": true, ... },
    ...
  ]
}
```

**主页**: 返回 HTML 页面，显示所有热点数据源卡片

## 🔧 常见问题排查

### 1. 端口被占用

```bash
# 检查端口占用
netstat -ano | findstr :3000

# 或者
docker ps --filter "port=3000"

# 解决方案：使用其他端口
docker run -d -p 8080:3000 --name newshub newshub:latest
```

### 2. 容器启动失败

```bash
# 查看详细日志
docker logs newshub

# 进入容器调试
docker exec -it newshub sh
ls -la /app
node --version
```

### 3. 构建失败

```bash
# 清理缓存重新构建
docker system prune -a
docker build --no-cache -t newshub:latest .
```

### 4. 无法访问 API

```bash
# 检查容器是否运行
docker ps | grep newshub

# 检查端口映射
docker port newshub

# 检查容器内服务
docker exec newshub curl -s http://localhost:3000/api/v1/health
```

## 📝 完整部署流程

```bash
# 1. 准备工作
git pull origin main
cd /path/to/newshub.shenzjd.com

# 2. 清理旧容器（如果存在）
docker stop newshub 2>/dev/null
docker rm newshub 2>/dev/null

# 3. 构建并启动
docker-compose up -d --build

# 4. 等待服务启动（约 10-30 秒）
sleep 10

# 5. 运行测试
./test-docker.sh

# 6. 查看实时日志
docker-compose logs -f
```

## 🎯 高级配置

### 环境变量

```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e SITE_URL=https://your-domain.com \
  -e API_SECRET=your-secret-key \
  -v ./data:/app/data \
  --name newshub \
  newshub:latest
```

### 资源限制

```yaml
# 在 docker-compose.yml 中添加
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 128M
```

### 日志配置

```bash
# 查看最近 100 行日志
docker logs --tail 100 newshub

# 实时跟踪日志
docker logs -f newshub

# 查看特定时间段日志
docker logs --since 1h newshub
```

## 📞 技术支持

如果遇到问题，请提供：
1. `docker logs newshub` 的输出
2. `docker ps -a` 的输出
3. `./test-docker.sh` 的测试结果
4. 操作系统和 Docker 版本

---

**部署成功标志**: 访问 http://localhost:3000/ 能看到热点聚合页面
