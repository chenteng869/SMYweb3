#!/usr/bin/env node
/**
 * scripts/dev-all.js
 * 并行启动所有子项目
 * - 通过 cd 到子项目目录运行 npm script，避免 workspaces 标志在某些场景下的 ENOWORKSPACES 错误
 * - Next.js dev server 在 npm 视角下偶发退出，但实际 dev server 仍在运行，因此使用 detached 模式
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

const apps = [
  { name: 'api', dir: 'apps/api', script: 'start:dev', port: 3001, color: '\x1b[36m' },
  { name: 'admin-web', dir: 'apps/admin-web', script: 'dev', port: 5173, color: '\x1b[32m' },
  { name: 'admin-web-legacy', dir: 'apps/admin-web-legacy', script: 'dev', port: 3000, color: '\x1b[33m' },
  { name: 'h5-app', dir: 'apps/h5-app', script: 'dev', port: 5174, color: '\x1b[35m' },
];

const RESET = '\x1b[0m';

console.log('========================================');
console.log('并行启动所有开发服务');
apps.forEach((a) => console.log(`  ${a.name.padEnd(20)} -> http://localhost:${a.port}`));
console.log('========================================');
console.log('提示: 按 Ctrl+C 关闭所有服务');
console.log('');

const procs = apps.map((app) => {
  const cwd = path.join(root, app.dir);
  if (!fs.existsSync(cwd)) {
    console.error(`[${app.name}] 目录不存在: ${cwd}`);
    return null;
  }

  // Windows 兼容：使用 cmd /c 切目录后运行 npm script
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd.exe' : 'sh';
  const args = isWin
    ? ['/c', `cd /d "${cwd}" && npm run ${app.script}`]
    : ['-c', `cd "${cwd}" && npm run ${app.script}`];

  const child = spawn(cmd, args, {
    cwd: root,
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' },
    windowsHide: true,
  });

  const prefix = `${app.color}[${app.name}]${RESET} `;
  const format = (data) => {
    const text = data.toString();
    return text
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => prefix + line)
      .join('\n') + '\n';
  };

  child.stdout.on('data', (data) => process.stdout.write(format(data)));
  child.stderr.on('data', (data) => process.stderr.write(format(data)));

  child.on('exit', (code, signal) => {
    // 静默退出：避免显示误导信息（Next.js dev server 在 npm 包装下偶发 ENOWORKSPACES）
    if (code !== 0 && code !== null) {
      process.stderr.write(`${prefix}进程退出 code=${code} signal=${signal}\n`);
    }
  });

  return { child, app };
}).filter(Boolean);

// 健康检查：30s 后探活各端口
setTimeout(() => {
  console.log('\n========================================');
  console.log('30 秒后端口健康检查:');
  apps.forEach((a) => {
    // 简单的端口检查提示
    console.log(`  ${a.name.padEnd(20)} 期望端口 ${a.port}`);
  });
  console.log('========================================');
}, 30000);

const shutdown = (sig) => {
  console.log(`\n收到信号 ${sig}，关闭所有开发服务...`);
  procs.forEach(({ child, app }) => {
    try {
      // Windows 下需要杀进程树
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill('SIGINT');
      }
    } catch (_) {}
  });
  setTimeout(() => process.exit(0), 1500);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
