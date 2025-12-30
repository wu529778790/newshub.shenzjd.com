# 使用 Node.js 官方镜像作为基础镜像
FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产镜像
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=base /app/.output ./.output

# 复制 Docker 启动脚本
COPY --from=base /app/docker-start.mjs ./

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# 创建数据目录并设置权限
RUN mkdir -p /app/data/cache && chown -R nuxt:nodejs /app/data /app/.output

# 切换到非 root 用户
USER nuxt

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "docker-start.mjs"]
