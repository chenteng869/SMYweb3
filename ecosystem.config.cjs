module.exports = {
  apps: [
    {
      name: 'smyweb3-api',
      script: 'dist/main.js',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://smyweb3:smyweb3_pass@postgres:5432/smyweb3_db?schema=public',
        JWT_SECRET: '${JWT_SECRET}',
        JWT_EXPIRES_IN: '24h',
        REDIS_URL: 'redis://redis:6379',
        WEBHOOK_SECRET: '${WEBHOOK_SECRET}',
        CORS_ORIGIN: 'https://admin.smyweb3.com,https://h5.smyweb3.com',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      // 前端静态文件由 Nginx 处理，此处仅作备用或 SSR 场景
      name: 'smyweb3-admin-web',
      script: 'npx',
      args: 'serve -s dist -l 3002 -t',
      cwd: './apps/admin-web',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/SMYweb3.git',
      path: '/var/www/smyweb3',
      'pre-deploy': 'git fetch --all',
      'post-deploy':
        'npm install && cd apps/api && npm run build && cd ../admin-web && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
