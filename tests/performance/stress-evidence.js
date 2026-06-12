// 区块链存证接口压力测试
// 目标: 100 QPS 持续 5 分钟，P99 ≤ 3s

import http from 'k6/http';
import { check, sleep } from 'k6/exec';
import { Rate, Trend, Counter } from 'k6/metrics';

const evidenceSuccessRate = new Rate('evidence_create_success');
const evidenceLatency = new Trend('evidence_latency_ms');
const evidenceThroughput = new Counter('evidence_total_requests');

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    evidence_create_success: ['rate>0.99'],
  },
  discardResponseBodies: true,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const TEST_FILE_ID = 1;

export default function () {
  evidenceThroughput.add(1);
  const start = Date.now();
  const res = http.post(`${BASE_URL}/evidence/create`, JSON.stringify({
    fileId: TEST_FILE_ID,
    evidenceType: 'document',
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    timeout: '10s',
  });
  evidenceLatency.add(Date.now() - start);
  evidenceSuccessRate.add(res.status === 201);
  check(res, {
    'evidence created': (r) => r.status === 201 || r.status === 202,
    'has txHash': (r) => res.json('txHash') !== undefined,
    'has blockNumber': (r) => res.json('blockNumber') !== undefined,
  });
  sleep(Math.random() * 0.01);
}