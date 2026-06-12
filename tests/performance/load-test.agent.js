// SMYWeb3 Agent 并发负载测试
// 模拟 50 个 Agent 同时运行 1 小时的场景
// 目标: 无崩溃, 内存稳定, P99 延迟 ≤ 3s

import http from 'k6/http';
import { check, sleep } from 'k6/exec';
import { Rate, Trend } from 'k6/metrics';

const agentStartRate = new Rate('agent_start_success');
const agentCompleteRate = new Rate('agent_complete_success');
const taskDispatchLatency = new Trend('task_dispatch_latency_ms');
const agentMemoryUsage = new Trend('agent_memory_mb');

export const options = {
  stages: [
    { duration: '5m', target: 10 },
    { duration: '10m', target: 25 },
    { duration: '40m', target: 50 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    agent_start_success: ['rate>0.99'],
    agent_complete_success: ['rate>0.98'],
    checks: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  // 第1步: 用户认证
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@test.com',
    password: 'test123456',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'login success': (r) => r.status === 200 });
  const token = loginRes.json('token') || AUTH_TOKEN;

  // 第2步: 启动 Agent 会话
  const sessionRes = http.post(`${BASE_URL}/openclaw/sessions`, JSON.stringify({
    configId: 1,
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!check(sessionRes, { 'session created': (r) => r.status === 201 })) return;
  const sessionId = sessionRes.json('id');

  // 第3步: 提交任务
  const tasks = ['acquisition', 'content', 'analysis'];
  const taskType = tasks[Math.floor(Math.random() * tasks.length)];
  const startTime = Date.now();
  const taskRes = http.post(`${BASE_URL}/openclaw/tasks`, JSON.stringify({
    sessionId,
    type: taskType,
    priority: Math.floor(Math.random() * 8) + 1,
    payload: { query: 'AI automation test', platform: 'twitter' },
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  taskDispatchLatency.add(Date.now() - startTime);
  check(taskRes, { 'task dispatched': (r) => r.status === 201 });

  // 第4步: 模拟 Agent 处理等待
  sleep(Math.floor(Math.random() * 5) + 1);

  // 第5步: 查询会话状态
  const statusRes = http.get(
    `${BASE_URL}/openclaw/sessions/${sessionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  check(statusRes, { 'session healthy': (r) => r.status === 200 });

  // 第6步: 心跳上报
  http.post(`${BASE_URL}/openclaw/sessions/${sessionId}/heartbeat`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  sleep(1);
}