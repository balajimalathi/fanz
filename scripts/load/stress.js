/**
 * k6 stress test script.
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 * Then run:
 *   k6 run scripts/load/stress.js
 *   k6 run -e BASE_URL=http://localhost:4000 scripts/load/stress.js
 *   k6 run --vus 50 --duration 60s scripts/load/stress.js
 *
 * Environment (optional):
 *   BASE_URL - default http://localhost:4000
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// Only open routes (no auth): / and /login
const PATHS = ['/', '/login'];

export const options = {
  stages: [
    { duration: '15s', target: 3 },   // Warm-up: low load so server is ready
    { duration: '30s', target: 20 },  // Ramp up to 20 VUs
    { duration: '1m', target: 20 },   // Stay at 20 VUs
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m', target: 50 },   // Stay at 50 VUs (stress)
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // Stress-test thresholds (looser than production SLO)
    http_req_duration: ['p(99)<60000'], // 99% under 60s (stress can be slow)
    http_req_failed: ['rate<0.25'],     // Error rate under 25%
  },
};

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE_URL}${path}`);
  check(res, { 'status 2xx/3xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(0.5 + Math.random());
}
