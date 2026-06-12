#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Workspace: ${COZE_WORKSPACE_PATH}"
echo "Node version:"
node -v
echo "PNPM version:"
pnpm -v

# 删除根目录下可能存在的多余 lockfile
rm -f /pnpm-lock.yaml 2>/dev/null || true

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building the Next.js project..."
# Next.js 16 默认使用 Turbopack，比 Webpack 更快
# 注意：不要设置 NODE_ENV=production，否则 pnpm 会跳过 devDependencies
# typescript 是 devDependency，next.config.ts 编译需要它
pnpm next build

echo "Build completed successfully!"
