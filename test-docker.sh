#!/bin/bash

echo "🚀 NewsHub Docker 部署测试工具"
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装或未在 PATH 中${NC}"
    echo "请安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker 已安装${NC}"

# 1. 检查容器状态
echo -e "\n1️⃣ 检查容器状态..."
CONTAINER_STATUS=$(docker ps -a --filter "name=newshub" --format "{{.Status}}")
if [ -n "$CONTAINER_STATUS" ]; then
    echo -e "${GREEN}✅ 容器存在: $CONTAINER_STATUS${NC}"
else
    echo -e "${RED}❌ 未找到名为 'newshub' 的容器${NC}"
fi

# 2. 检查运行中的容器
echo -e "\n2️⃣ 检查运行中的容器..."
RUNNING=$(docker ps --filter "name=newshub" --format "{{.Names}}")
if [ -n "$RUNNING" ]; then
    echo -e "${GREEN}✅ 容器正在运行${NC}"
else
    echo -e "${YELLOW}⚠️  容器未运行，尝试启动...${NC}"
    docker start newshub 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 容器已启动${NC}"
        sleep 2
    else
        echo -e "${RED}❌ 无法启动容器${NC}"
    fi
fi

# 3. 查看容器日志（最后10行）
echo -e "\n3️⃣ 容器日志（最后10行）..."
docker logs newshub --tail 10 2>/dev/null || echo -e "${RED}❌ 无法获取日志${NC}"

# 4. 检查端口映射
echo -e "\n4️⃣ 检查端口映射..."
PORT_MAPPING=$(docker port newshub 2>/dev/null)
if [ -n "$PORT_MAPPING" ]; then
    echo -e "${GREEN}✅ 端口映射: $PORT_MAPPING${NC}"
else
    echo -e "${YELLOW}⚠️  未找到端口映射信息${NC}"
fi

# 5. 测试服务健康状态
echo -e "\n5️⃣ 测试服务健康状态..."
sleep 2
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 健康检查通过 (HTTP 200)${NC}"

    # 显示详细信息
    echo -e "\n📊 服务详情:"
    curl -s http://localhost:3000/api/v1/health 2>/dev/null | \
        grep -o '"status":"[^"]*"\|"sources":{[^}]*}' | \
        sed 's/"status":/状态: /; s/"sources":/数据源: /; s/{/ /; s/}/ /' | \
        head -2

else
    echo -e "${RED}❌ 健康检查失败 (HTTP $RESPONSE)${NC}"

    # 诊断信息
    echo -e "\n🔍 诊断信息:"
    echo "容器状态:"
    docker ps -a --filter "name=newshub" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo -e "\n端口占用:"
    netstat -tlnp 2>/dev/null | grep :3000 || echo "端口 3000 未被占用"
fi

# 6. 测试数据源 API
echo -e "\n6️⃣ 测试数据源 API..."
SOURCES_RESPONSE=$(curl -s http://localhost:3000/api/v1/sources 2>/dev/null | grep -o '"count":[0-9]*')
if [ -n "$SOURCES_RESPONSE" ]; then
    echo -e "${GREEN}✅ 数据源 API 正常: $SOURCES_RESPONSE${NC}"
else
    echo -e "${RED}❌ 数据源 API 访问失败${NC}"
fi

# 7. 测试主页
echo -e "\n7️⃣ 测试主页访问..."
HOME_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
if [ "$HOME_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 主页访问正常 (HTTP 200)${NC}"
else
    echo -e "${RED}❌ 主页访问失败 (HTTP $HOME_RESPONSE)${NC}"
fi

# 8. 测试具体数据源
echo -e "\n8️⃣ 测试具体数据源 (百度)..."
BAIDU_RESPONSE=$(curl -s http://localhost:3000/api/hot/baidu 2>/dev/null | head -1)
if [ -n "$BAIDU_RESPONSE" ]; then
    echo -e "${GREEN}✅ 百度热点 API 正常${NC}"
    echo "响应示例: ${BAIDU_RESPONSE:0:100}..."
else
    echo -e "${RED}❌ 百度热点 API 访问失败${NC}"
fi

# 9. 完整的快速测试
echo -e "\n9️⃣ 快速测试所有端点..."
echo "=================================="
for endpoint in "/api/v1/health" "/api/v1/sources" "/" "/api/hot/baidu"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint" 2>/dev/null)
    if [ "$CODE" = "200" ]; then
        echo -e "✅ $endpoint → HTTP $CODE"
    else
        echo -e "❌ $endpoint → HTTP $CODE"
    fi
done

echo -e "\n=================================="
echo "🎉 测试完成！"

# 如果所有测试都通过
if [ "$RESPONSE" = "200" ] && [ "$HOME_RESPONSE" = "200" ]; then
    echo -e "\n${GREEN}✅ 所有核心功能正常！${NC}"
    echo "访问地址: http://localhost:3000/"
    echo "API 文档: http://localhost:3000/api/v1/health"
else
    echo -e "\n${RED}❌ 存在问题，请检查上面的诊断信息${NC}"
    echo -e "\n💡 常见解决方案:"
    echo "1. 检查容器日志: docker logs newshub"
    echo "2. 重启容器: docker restart newshub"
    echo "3. 重新构建: docker build -t newshub:latest . && docker run -d -p 3000:3000 --name newshub newshub:latest"
fi
