# Logging Setup with Loki and Grafana

This document explains the complete logging setup for your Next.js application using Loki, Grafana, and Promtail.

## Overview

All `console.log()` and `console.error()` calls in your Next.js application are automatically intercepted and sent to:
1. **Log files** (written to `/var/log/app` in Docker or `./logs` locally)
2. **Loki** (log aggregation system) via HTTP API
3. **Promtail** (collects logs from files and sends to Loki)
4. **Grafana** (for visualization and dashboards)

## Architecture

```
Next.js App (console.log/error)
    ↓
Logger Utility (lib/utils/logger.ts)
    ↓
├──→ Log Files (/var/log/app/console.log, error.log)
│       ↓
│   Promtail (reads log files)
│       ↓
│   Loki (stores logs)
│       ↓
│   Grafana (visualizes logs)
│
└──→ Direct HTTP → Loki (fallback)
```

## Files Created

### Docker Configuration
- `docker/docker-compose.yaml` - Main Docker Compose file for Loki, Grafana, and Promtail
- `docker/loki-config.yaml` - Loki server configuration
- `docker/promtail-config.yaml` - Promtail log collection configuration
- `docker/grafana/provisioning/datasources/loki.yaml` - Grafana Loki datasource
- `docker/grafana/provisioning/dashboards/default.yaml` - Dashboard provisioning
- `docker/grafana/dashboards/nextjs-logs.json` - Pre-configured dashboard

### Application Code
- `lib/utils/logger.ts` - Logger utility that intercepts console methods
- `instrumentation.ts` - Next.js instrumentation file that initializes logger on startup
- `next.config.ts` - Updated with `instrumentationHook: true`

### Documentation
- `docker/README.md` - Detailed documentation
- `docker/QUICKSTART.md` - Quick start guide

## Quick Start

### Windows (Local Development)

1. **Start the logging stack:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Start your Next.js app** (runs normally, logs automatically captured):
   ```bash
   npm run dev
   ```

3. **If running Next.js outside Docker**, update `docker/docker-compose.yaml`:
   ```yaml
   # In promtail service, change:
   - app-logs:/var/log/app:ro
   # To:
   - ../logs:/var/log/app:ro
   ```

4. **View logs in Grafana:**
   - Open: http://localhost:3001
   - Click "Explore" → Select "Loki"
   - Query: `{job="nextjs"}`

### Ubuntu (Server)

1. **Start the logging stack:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Ensure your Next.js app docker-compose.yml includes:**
   - Volume mount: `app-logs:/var/log/app`
   - Environment: `LOG_DIR=/var/log/app`
   - Network: Connection to `logging-network`

3. **View logs:**
   - Open: `http://your-server-ip:3001`

## How It Works

### Logger Initialization

The logger is automatically initialized when Next.js starts via `instrumentation.ts`:

```typescript
// instrumentation.ts runs once per Node.js process
export async function register() {
  if (typeof window === 'undefined' && !loggerInitialized) {
    const { setupLogger } = await import('@/lib/utils/logger');
    setupLogger(); // Overrides console.log, console.error, etc.
  }
}
```

### Log Interception

When your code calls:
```typescript
console.log("User logged in", { userId: 123 });
console.error("Payment failed", error);
```

The logger:
1. Extracts metadata (location, timestamp, level)
2. Writes to log files (`/var/log/app/console.log` or `error.log`)
3. Sends to Loki via HTTP API (non-blocking)
4. Also calls original console method (so logs still appear in terminal)

### Log Collection

Promtail:
- Watches log files in `/var/log/app/`
- Parses log format (timestamp, level, location, message)
- Adds labels (job, app, environment, level, location)
- Sends to Loki with structured labels

### Visualization

Grafana:
- Pre-configured Loki datasource
- Pre-configured dashboard with:
  - Logs over time graph
  - All logs panel
  - Error logs panel
  - Log level distribution

## Environment Variables

### Next.js Application

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_DIR` | `./logs` (Win) or `/var/log/app` (Linux) | Directory to write log files |
| `LOKI_URL` | `http://localhost:3100/loki/api/v1/push` | Loki push API URL |
| `NODE_ENV` | `development` | Environment name (used in labels) |

### Docker Compose

No environment variables needed - everything is pre-configured!

## Log Queries (LogQL)

In Grafana Explore, try these queries:

```logql
# All logs
{job="nextjs"}

# Error logs only
{job="nextjs", level="error"}

# Search for keyword
{job="nextjs"} |= "payment"

# Filter by location
{job="nextjs", location=~".*route.*"}

# Count errors by location
sum(count_over_time({job="nextjs", level="error"}[5m])) by (location)

# Recent errors with context
{job="nextjs", level="error"} | limit 100
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| Grafana | 3001 | http://localhost:3001 |
| Loki | 3100 | http://localhost:3100 |
| Promtail | 9080 | http://localhost:9080 (internal) |
| Next.js | 3000, 4000 | http://localhost:3000, http://localhost:4000 |

## Troubleshooting

### Logs not appearing in Grafana?

1. Check Promtail logs: `docker logs desifans-promtail`
2. Verify log files exist: `docker exec desifans-promtail ls -la /var/log/app`
3. Check Loki is running: `curl http://localhost:3100/ready`
4. Verify network: `docker network inspect docker_logging-network`

### Permission issues (Ubuntu)?

```bash
# Fix log directory permissions
sudo chmod -R 755 /var/log/app
sudo chown -R $(id -u):$(id -g) /var/log/app
```

### App container can't write logs?

Ensure your app container:
- Mounts the volume: `app-logs:/var/log/app`
- Has environment: `LOG_DIR=/var/log/app`
- Is connected to `logging-network`

## Stopping Services

```bash
cd docker
docker-compose down
```

To remove all data (⚠️ deletes logs and Grafana data):
```bash
docker-compose down -v
```

## Production Considerations

1. **Security:**
   - Enable Grafana authentication
   - Restrict Loki/Promtail network access
   - Use HTTPS for Grafana

2. **Performance:**
   - Adjust log retention period in `loki-config.yaml`
   - Set resource limits in docker-compose.yaml
   - Consider log rotation for large deployments

3. **Monitoring:**
   - Set up alerting rules in Loki
   - Monitor Loki/Promtail/Grafana health
   - Regular backups of Loki data

## Next Steps

- Customize Grafana dashboards for your needs
- Set up alerting rules in Loki for critical errors
- Configure log retention based on your requirements
- Add more log labels for better filtering (user ID, request ID, etc.)

## Support

For detailed documentation, see:
- `docker/README.md` - Complete setup guide
- `docker/QUICKSTART.md` - Quick start guide

For issues, check:
- Promtail logs: `docker logs desifans-promtail`
- Loki logs: `docker logs desifans-loki`
- Grafana logs: `docker logs desifans-grafana`
