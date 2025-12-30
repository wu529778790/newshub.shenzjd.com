FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制所有文件
COPY . .

# 安装依赖并构建
RUN pnpm install --frozen-lockfile && pnpm build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "start.mjs"]