#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "🔍 Running TypeScript check..."
pnpm ts-check
echo "✅ TypeScript check passed!"
