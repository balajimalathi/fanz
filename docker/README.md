# Loki and Grafana Logging Setup

This directory contains the Docker Compose configuration for running Loki, Grafana, and Promtail for centralized log aggregation and visualization.

## Architecture

- **Loki**: Log aggregation system that stores logs
- **Grafana**: Visualization and dashboarding platform
- **Promtail**: Log shipper that collects logs from files and sends them to Loki

## Prerequisites

- Docker and Docker Compose installed
- Next.js application configured with logging (see `lib/utils/logger.ts`)

## Quick Start

### Windows (Local Development)

1. Start the logging stack:
   ```bash
   cd docker
   docker-compose up -d
   ```

2. Configure your Next.js app to use logging:
   - Set environment variable: `LOG_DIR=./logs`
   - Or use default: logs will be written to `./logs` directory

3. The logging stack will be available at:
   - **Grafana**: http://localhost:3001
   - **Loki**: http://localhost:3100

### Ubuntu (Server)

1. Start the logging stack:
   ```bash
   cd docker
   docker-compose up -d
   ```

2. Ensure your Next.js app is configured with:
   - `LOG_DIR=/var/log/app` (default for Linux)
   - `LOKI_URL=http://loki:3100/loki/api/v1/push`
   - The app container should mount the `app-logs` volume to `/var/log/app`

3. Access Grafana at: `http://your-server-ip:3001`

## Configuration Files

- `docker-compose.yaml`: Main Docker Compose configuration
- `loki-config.yaml`: Loki server configuration
- `promtail-config.yaml`: Promtail log collection configuration
- `grafana/provisioning/`: Grafana datasource and dashboard provisioning

## Volumes

- `loki-data`: Stores Loki data
- `grafana-data`: Stores Grafana data and dashboards
- `app-logs`: Shared volume for application logs (shared with Next.js app)

## Networks

- `logging-network`: Bridge network for Loki, Grafana, and Promtail communication

## Integration with Next.js App

The Next.js application uses `lib/utils/logger.ts` which:
1. Intercepts `console.log()` and `console.error()` calls
2. Writes logs to files in `/var/log/app` (or `./logs` on Windows)
3. Optionally sends logs directly to Loki via HTTP API
4. Promtail collects logs from these files and forwards to Loki

### Environment Variables

For the Next.js app:
- `LOG_DIR`: Directory to write log files (default: `/var/log/app` on Linux, `./logs` on Windows)
- `LOKI_URL`: Loki push API URL (default: `http://localhost:3100/loki/api/v1/push`)
- `NODE_ENV`: Environment name (used in log labels)

## Viewing Logs in Grafana

1. Open Grafana at http://localhost:3001 (or your server IP:3001)
2. Navigate to "Explore" in the left sidebar
3. Select "Loki" as the data source
4. Use LogQL queries such as:
   - `{job="nextjs"}` - All logs
   - `{job="nextjs", level="error"}` - Error logs only
   - `{job="nextjs"} |= "keyword"` - Search for specific keyword

## Pre-configured Dashboard

A pre-configured dashboard is available at `grafana/dashboards/nextjs-logs.json` which includes:
- Logs over time graph
- All logs panel
- Error logs panel
- Log level distribution pie chart

## Troubleshooting

### Logs not appearing in Grafana

1. Check if Promtail is running: `docker ps | grep promtail`
2. Check Promtail logs: `docker logs desifans-promtail`
3. Verify log files exist: `docker exec desifans-promtail ls -la /var/log/app`
4. Check if the volume is mounted correctly in your app container

### Loki connection issues

1. Check Loki is running: `docker ps | grep loki`
2. Test Loki API: `curl http://localhost:3100/ready`
3. Check network connectivity: `docker network inspect docker_logging-network`

### File permission issues (Ubuntu)

If Promtail can't read log files:
```bash
# Set proper permissions on log directory
sudo chown -R 10001:10001 /var/log/app
sudo chmod -R 755 /var/log/app
```

Or adjust the Promtail user in docker-compose.yaml.

## Stopping Services

```bash
cd docker
docker-compose down
```

To also remove volumes (this will delete all stored logs and Grafana data):
```bash
docker-compose down -v
```

## Maintenance

### Backup Loki Data

```bash
docker run --rm -v docker_loki-data:/data -v $(pwd):/backup alpine tar czf /backup/loki-backup.tar.gz /data
```

### Restore Loki Data

```bash
docker run --rm -v docker_loki-data:/data -v $(pwd):/backup alpine tar xzf /backup/loki-backup.tar.gz -C /
```

### View Log Retention

Logs are retained for 30 days by default (configured in `loki-config.yaml`). Adjust the `retention_period` value to change this.

## Production Considerations

1. **Security**: Set up authentication for Grafana in production
2. **Persistent Storage**: Ensure volumes are backed up regularly
3. **Resource Limits**: Add resource limits to docker-compose.yaml
4. **Network Security**: Use proper firewall rules to restrict access
5. **Log Retention**: Adjust retention periods based on your needs and storage capacity
