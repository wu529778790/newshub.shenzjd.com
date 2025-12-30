#!/bin/bash

# Docker 部署诊断脚本
# 使用方法: ./docker-diagnose.sh

set -e

CONTAINER_NAME="newshub"
IMAGE_GHCR="ghcr.io/wu529778790/newshub.shenzjd.com:latest"
IMAGE_DOCKERHUB="wu529778790/newshub.shenzjd.com:latest"

echo "=========================================="
echo "  NewsHub Docker 部署诊断工具"
echo "=========================================="
echo ""

# 检查 Docker 是否安装
echo "🔍 检查 Docker 安装..."
if command -v docker &> /dev/null; then
    echo "✅ Docker 已安装: $(docker --version)"
else
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi
echo ""

# 检查 Docker 服务状态
echo "🔍 检查 Docker 服务..."
if docker info &> /dev/null; then
    echo "✅ Docker 服务正在运行"
else
    echo "❌ Docker 服务未运行，请启动 Docker"
    exit 1
fi
echo ""

# 检查容器是否存在
echo "🔍 检查容器状态..."
if docker ps -a --filter "name=$CONTAINER_NAME" | grep -q $CONTAINER_NAME; then
    echo "✅ 容器 $CONTAINER_NAME 存在"

    # 检查容器是否运行
    if docker ps --filter "name=$CONTAINER_NAME" | grep -q $CONTAINER_NAME; then
        echo "✅ 容器正在运行"

        # 显示容器详细信息
        echo ""
        echo "📋 容器信息:"
        docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.RunningFor}}"

        # 检查健康状态
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "N/A")
        echo ""
        echo "❤️  健康状态: $HEALTH_STATUS"

        # 显示资源使用
        echo ""
        echo "📊 资源使用:"
        docker stats --no-stream --filter "name=$CONTAINER_NAME"
    else
        echo "⚠️  容器已停止，正在尝试启动..."
        docker start $CONTAINER_NAME
        sleep 5
    fi
else
    echo "⚠️  容器不存在，需要创建"
fi
echo ""

# 检查端口占用
echo "🔍 检查端口 3000..."
if netstat -ano 2>/dev/null | grep -q ":3000" || lsof -i :3000 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  端口 3000 已被占用"
    echo "   正在占用的进程:"
    netstat -ano 2>/dev/null | grep ":3000" || lsof -i :3000 2>/dev/null
else
    echo "✅ 端口 3000 空闲"
fi
echo ""

# 检查镜像
echo "🔍 检查镜像..."
if docker images | grep -q "newshub"; then
    echo "✅ 找到 NewsHub 镜像"
    docker images | grep newshub
else
    echo "⚠️  未找到本地镜像，需要拉取"
fi
echo ""

# 测试 API
echo "🔍 测试 API..."
if curl -s http://localhost:3000/api/v1/sources > /dev/null 2>&1; then
    echo "✅ API 响应正常"

    # 测试新数据源
    echo ""
    echo "📋 测试新数据源:"
    for source in hackernews producthunt eastmoney bbcnews v2exnew; do
        if curl -s "http://localhost:3000/api/v1/sources/$source" | grep -q '"data"'; then
            echo "  ✅ $source"
        else
            echo "  ❌ $source"
        fi
    done
else
    echo "❌ API 无响应"
    echo "   尝试查看日志: docker logs $CONTAINER_NAME"
fi
echo ""

# 显示日志
echo "📋 最近日志 (最后 20 行):"
docker logs --tail 20 $CONTAINER_NAME 2>/dev/null || echo "无法获取日志"
echo ""

# 显示建议
echo "=========================================="
echo "  诊断完成"
echo "=========================================="
echo ""
echo "💡 如果容器未运行，请执行:"
echo "   docker-compose up -d"
echo ""
echo "💡 如果需要查看日志:"
echo "   docker-compose logs -f"
echo ""
echo "💡 如果需要重新创建容器:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "💡 如果镜像不存在:"
echo "   docker pull ghcr.io/wu529778790/newshub.shenzjd.com:latest"
echo ""
