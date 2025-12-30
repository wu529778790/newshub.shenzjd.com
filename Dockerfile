FROM node:20-alpine AS base

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段 - 最小化镜像
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod --no-optional

# 复制构建产物
COPY --from=base /app/.output ./.output
COPY --from=base /app/start.mjs ./

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "start.mjs"]