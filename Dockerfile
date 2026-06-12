# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

# 安装 bash 和 pnpm（一步完成）
RUN apk add --no-cache bash && \
    corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

# 复制依赖文件（利用缓存）
COPY package.json pnpm-lock.yaml .npmrc* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# ==================== 运行阶段 ====================
FROM node:20-alpine AS runner

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 设置环境变量
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 启动应用
CMD ["node", "server.js"]
