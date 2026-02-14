# Load & stress testing

## Quick start (Node – no extra install)

With the app running (`pnpm run start` or `pnpm run dev`):

```bash
pnpm run load
```

Optional env:

- `BASE_URL` – default `http://localhost:4000` (use `http://localhost:3000` for dev)
- `DURATION` – seconds (default `15`)
- `CONNECTIONS` – concurrent connections (default `25`)
- `PIPELINING` – requests per connection (default `1`)

Example:

```bash
BASE_URL=http://localhost:3000 DURATION=30 CONNECTIONS=50 pnpm run load
```

## Heavier stress test (k6)

Install [k6](https://k6.io/docs/get-started/installation/). **Start the app first** in one terminal (`pnpm run start`), then in another:

```bash
k6 run scripts/load/stress.js
```

The script includes a short warm-up (3 VUs for 15s) before ramping to 50 VUs. Thresholds are stress-oriented (p99 &lt; 60s, error rate &lt; 25%) so the run completes without threshold failures while you still see real latency and error metrics.

Override base URL or k6 options:

```bash
k6 run -e BASE_URL=http://localhost:4000 scripts/load/stress.js
k6 run --vus 100 --duration 120s scripts/load/stress.js
```
