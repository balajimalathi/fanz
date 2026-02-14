#!/usr/bin/env node
/**
 * Load test the Next.js app using autocannon.
 *
 * Usage:
 *   BASE_URL=http://localhost:4000 pnpm run load
 *   BASE_URL=http://localhost:4000 DURATION=30 CONNECTIONS=50 pnpm run load
 *
 * Ensure the app is running (e.g. pnpm run start) before running this script.
 */

const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const DURATION = parseInt(process.env.DURATION || '15', 10);
const CONNECTIONS = parseInt(process.env.CONNECTIONS || '25', 10);
const PIPELINING = parseInt(process.env.PIPELINING || '1', 10);

/** Open routes only (no auth): / and /login */
const PATHS = ['/', '/login'];

function runOne(url, label) {
  return new Promise((resolve, reject) => {
    const opts = {
      url,
      connections: CONNECTIONS,
      duration: DURATION,
      pipelining: PIPELINING,
      title: label || url,
    };
    autocannon(opts, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

function printResult(result) {
  const r = result;
  console.log('\n---', r.title, '---');
  console.log('  Requests:', r.requests.total, '| Requests/s:', r.requests.average);
  console.log('  Latency avg:', (r.latency.mean / 1000).toFixed(2), 'ms');
  console.log('  Latency p99:', (r.latency.p99 / 1000).toFixed(2), 'ms');
  console.log('  Errors:', r.errors, '| Timeouts:', r.timeouts);
}

async function main() {
  const base = BASE_URL.replace(/\/$/, '');
  console.log('Load test:', base);
  console.log('Duration:', DURATION, 's | Connections:', CONNECTIONS, '| Pipelining:', PIPELINING);
  console.log('');

  const results = [];
  for (const path of PATHS) {
    const url = base + path;
    try {
      const result = await runOne(url, path || '/');
      results.push(result);
      printResult(result);
    } catch (e) {
      console.error('Failed', path, e.message);
    }
  }

  if (results.length === 0) {
    console.error('No successful runs. Is the app running at', BASE_URL, '?');
    process.exit(1);
  }

  const totalRequests = results.reduce((s, r) => s + r.requests.total, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors + r.timeouts, 0);
  console.log('\n=== Summary ===');
  console.log('Total requests:', totalRequests);
  console.log('Total errors/timeouts:', totalErrors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
