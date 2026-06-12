#!/bin/bash
# SMYweb3 Pre-commit 检查
set -e

echo "🔍 Running pre-commit checks..."

# 1. 检查是否有 .env 文件被意外添加
if git diff --cached --name-only | grep -qE '\.env(\.|$)|\.pem$|.*\.key$'; then
  echo "❌ ERROR: Sensitive file detected in staging area!"
  echo "Files matching .env*, *.pem, *.key should not be committed."
  exit 1
fi

# 2. 检查是否有 console.log 残留（仅检查 staged 的 ts/tsx 文件）
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)
if [ -n "$STAGED_TS" ]; then
  LOGS=$(grep -r "console\.log" $STAGED_TS 2>/dev/null || true)
  if [ -n "$LOGS" ]; then
    echo "⚠️  WARNING: console.log found in staged files:"
    echo "$LOGS"
    echo "Please remove or replace with proper logging before committing."
    # 不阻止提交，只是警告
  fi
fi

# 3. 运行 TypeScript 类型检查（可选，如果 tsc 可用）
if command -v npx &> /dev/null; then
  echo "📝 Running type check on staged files..."
  # 仅检查是否有编译错误（不生成输出）
  npx tsc --noEmit --pretty 2>&1 || {
    echo "❌ TypeScript compilation failed. Please fix errors before committing."
    exit 1
  }
fi

echo "✅ All pre-commit checks passed!"
