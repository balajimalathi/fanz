# Quick Start Guide: Loki & Grafana Logging

## Step 1: Start the Logging Stack

### Windows (Local Development)

```bash
cd docker
docker-compose up -d
```

This will start:
- **Loki** on port `3100`
- **Grafana** on port `3001`
- **Promtail** (log collector)

### Ubuntu (Server)

Same command:
```bash
cd docker
docker-compose up -d
```

## Step 2: Configure Your Next.js App

The logger is automatically initialized when your Next.js app starts (via `instrumentation.ts`).

### For Local Development (Windows)

The logger will automatically write to `./logs` directory. No configuration needed!

### For Production (Ubuntu Server)

Ensure your Next.js app container has these environment variables:

```yaml
environment:
  - LOG_DIR=/var/log/app
  - LOKI_URL=http://loki:3100/loki/api/v1/push
```

And mount the log volume:
```yaml
volumes:
  - app-logs:/var/log/app
```

Also ensure your app container is connected to the `logging-network`:
```yaml
networks:
  - logging-network:
      external: true
```

## Step 3: Verify Logs are Being Collected

1. Generate some logs by using your Next.js app
2. Check if log files are being created:
   ```bash
   # In your app container
   docker exec desifans-app ls -la /var/log/app
   ```

3. Check Promtail logs:
   ```bash
   docker logs desifans-promtail
   ```

## Step 4: View Logs in Grafana

1. Open Grafana: http://localhost:3001 (or `http://your-server-ip:3001` on Ubuntu)
2. Click "Explore" in the left sidebar
3. Select "Loki" as the data source
4. Try these queries:

   - All logs: `{job="nextjs"}`
   - Error logs only: `{job="nextjs", level="error"}`
   - Search for keyword: `{job="nextjs"} |= "error"`
   - Filter by location: `{job="nextjs", location=~".*route.*"}`

5. View the pre-configured dashboard:
   - Go to "Dashboards" → "Browse"
   - Find "Next.js Application Logs"

## Common Queries

### View recent errors
```
{job="nextjs", level="error"} | limit 100
```

### Count errors by location
```
sum(count_over_time({job="nextjs", level="error"}[5m])) by (location)
```

### Search for specific API route errors
```
{job="nextjs"} |= "/api/" | level="error"
```

### View logs from last hour with specific keyword
```
{job="nextjs"} |= "payment" [1h]
```

## Troubleshooting

### Logs not appearing?

1. **Check if Promtail can see the log files:**
   ```bash
   docker exec desifans-promtail ls -la /var/log/app
   ```

2. **Check Promtail is reading files:**
   ```bash
   docker logs desifans-promtail | tail -20
   ```

3. **Verify network connectivity:**
   ```bash
   docker exec desifans-promtail wget -qO- http://loki:3100/ready
   ```

4. **Check if your app is writing logs:**
   ```bash
   docker exec desifans-app cat /var/log/app/console.log | tail -10
   ```

### Grafana not connecting to Loki?

1. Check Loki is running: `docker ps | grep loki`
2. Test Loki API: `curl http://localhost:3100/ready`
3. In Grafana, go to Configuration → Data Sources → Loki
4. Test the connection

### Permission issues (Ubuntu)?

If Promtail can't read files, you may need to adjust permissions:

```bash
# Option 1: Set permissions on host (if using host mount)
sudo chmod -R 755 /path/to/logs
sudo chown -R $(id -u):$(id -g) /path/to/logs

# Option 2: Run Promtail with different user (edit docker-compose.yaml)
# Add: user: "1000:1000" under promtail service
```

## Stopping Everything

```bash
cd docker
docker-compose down
```

To also remove volumes (⚠️ deletes all logs and Grafana data):
```bash
docker-compose down -v
```

## Next Steps

- Customize log retention in `loki-config.yaml`
- Create custom Grafana dashboards
- Set up alerting rules in Loki
- Configure log rotation for large deployments
