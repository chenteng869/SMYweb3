#!/usr/bin/env node
/**
 * scripts/build-all.js
 * 统一构建所有子项目
 */
const { execSync } = require('child_process');
const path = require('path');

const apps = [
  { name: 'api', cmd: 'npm run build --workspace=api' },
  { name: 'admin-web', cmd: 'npm run build --workspace=admin-web' },
  { name: 'admin-web-legacy', cmd: 'npm run build --workspace=admin-web-legacy' },
  { name: 'h5-app', cmd: 'npm run build --workspace=h5-app' },
];

console.log('========================================');
console.log('开始构建所有子项目');
console.log('========================================');

for (const app of apps) {
  console.log(`\n[${app.name}] 构建中...`);
  try {
    execSync(app.cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log(`[${app.name}] ✓ 构建完成`);
  } catch (err) {
    console.error(`[${app.name}] ✗ 构建失败: ${err.message}`);
    process.exit(1);
  }
}

console.log('\n========================================');
console.log('✓ 所有子项目构建完成');
console.log('========================================');
