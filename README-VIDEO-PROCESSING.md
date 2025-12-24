# Video Processing with BullMQ

This project uses BullMQ for background video processing to avoid blocking the main application thread.

## Architecture

1. **Upload Route** (`/api/posts/[id]/video`): Accepts video uploads and enqueues processing jobs
2. **Job Queue** (BullMQ): Manages video processing jobs with Redis
3. **Worker Process** (`scripts/workers/video-processor.ts`): Processes videos in the background
4. **Status Endpoint** (`/api/posts/[id]/video/status`): Check processing status

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Redis

Add to your `.env.local`:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty if no password
REDIS_DB=0
```

For production (e.g., Railway, Render, Upstash):

```bash
# Example: Upstash Redis
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

### 3. Start Redis

**Local Development:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis
```

**Production:**
- Use managed Redis (Upstash, Railway Redis, AWS ElastiCache, etc.)

### 4. Start the Worker

**Development:**
```bash
pnpm worker:video
```

**Production (PM2):**
```bash
pm2 start pnpm --name "video-worker" -- worker:video
pm2 save
pm2 startup
```

**Production (systemd):**
Create `/etc/systemd/system/video-worker.service`:

```ini
[Unit]
Description=Video Processing Worker
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/app
Environment="NODE_ENV=production"
ExecStart=/usr/bin/pnpm worker:video
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable video-worker
sudo systemctl start video-worker
```

## Monitoring

### Check Queue Status

You can use BullMQ Board or create a simple admin endpoint:

```typescript
import { videoProcessingQueue } from "@/lib/queue/video-processing"

// Get queue stats
const waiting = await videoProcessingQueue.getWaitingCount()
const active = await videoProcessingQueue.getActiveCount()
const completed = await videoProcessingQueue.getCompletedCount()
const failed = await videoProcessingQueue.getFailedCount()
```

### View Jobs

Install BullMQ Board for a web UI:

```bash
pnpm add -D @bull-board/api @bull-board/express
```

## Job Retry Logic

- **Attempts**: 3 retries
- **Backoff**: Exponential (2s, 4s, 8s)
- **Failed Jobs**: Kept for 7 days for debugging

## Concurrency

The worker processes 2 videos concurrently by default. Adjust in `scripts/workers/video-processor.ts`:

```typescript
concurrency: 2, // Change based on server CPU/memory
```

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Check worker logs for errors

3. Verify job is in queue:
   ```typescript
   const jobs = await videoProcessingQueue.getJobs(['waiting', 'active'])
   console.log(jobs)
   ```

### Jobs failing

1. Check FFmpeg is installed:
   ```bash
   ffmpeg -version
   ```

2. Check worker logs for FFmpeg errors

3. Verify file paths and permissions

### High memory usage

- Reduce `concurrency` in worker config
- Process videos in smaller batches
- Consider using a dedicated server for video processing

## Production Checklist

- [ ] Redis configured and accessible
- [ ] Worker process running (PM2/systemd)
- [ ] Worker auto-restarts on failure
- [ ] Monitoring/alerting set up
- [ ] FFmpeg installed on worker server
- [ ] Sufficient disk space for temp files
- [ ] R2 credentials configured
- [ ] Error logging configured

