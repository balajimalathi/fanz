# Quick Start: Video Processing Setup

## 1. Install Dependencies

```bash
pnpm install
```

This installs:
- `bullmq` - Job queue library
- `ioredis` - Redis client

## 2. Start Redis

**Option A: Docker (Recommended for local dev)**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Option B: Local Installation**
```bash
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis
```

## 3. Configure Environment

Add to your `.env.local`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
REDIS_DB=0
```

For production (Upstash, Railway, etc.), use your Redis connection details.

## 4. Start the Worker

In a separate terminal:

```bash
pnpm worker:video
```

You should see:
```
🚀 Video processing worker started
📊 Concurrency: 2
🔗 Redis: localhost:6379
```

## 5. Test It

1. Upload a video through the UI
2. Check the worker terminal - you should see processing logs
3. The video will be processed in the background

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start worker
pm2 start pnpm --name "video-worker" -- worker:video

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using systemd

See `README-VIDEO-PROCESSING.md` for systemd service file example.

## Troubleshooting

**Worker not starting?**
- Check Redis is running: `redis-cli ping` (should return PONG)
- Check environment variables are set correctly

**Jobs not processing?**
- Verify worker is running
- Check Redis connection
- Look for errors in worker logs

**FFmpeg errors?**
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check file permissions on temp directories

## Next Steps

- Read `README-VIDEO-PROCESSING.md` for detailed documentation
- Set up monitoring (BullMQ Board recommended)
- Configure production Redis (Upstash, Railway, etc.)

