#!/usr/bin/env node
/**
 * scripts/clean.js
 * 清理所有子项目的构建产物和依赖
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const targets = [
  // 源码内构建产物
  'apps/api/dist',
  'apps/admin-web/dist',
  'apps/admin-web-legacy/.next',
  'apps/h5-app/dist',
  // 部署目录 (整目录清空)
  'deploy/admin-web',
  'deploy/admin-web-legacy',
  'deploy/h5-app',
];

console.log('========================================');
console.log('清理构建产物和部署目录');
console.log('========================================');

for (const rel of targets) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    console.log(`[clean] ${rel}`);
    fs.rmSync(abs, { recursive: true, force: true });
  }
}

const deep = process.argv.includes('--deep');
if (deep) {
  console.log('\n[deep] 清理 node_modules ...');
  const dirs = ['node_modules', 'apps/api/node_modules', 'apps/admin-web/node_modules', 'apps/admin-web-legacy/node_modules', 'apps/h5-app/node_modules'];
  for (const rel of dirs) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      console.log(`[clean] ${rel}`);
      fs.rmSync(abs, { recursive: true, force: true });
    }
  }
}

console.log('\n✓ 清理完成');
if (!deep) {
  console.log('  提示: 添加 --deep 参数同时清理 node_modules');
}
