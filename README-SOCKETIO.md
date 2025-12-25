# Socket.IO Chat Implementation

This project uses Socket.IO with Redis/Valkey adapter for real-time chat functionality. The implementation replaces the previous custom WebSocket server with a more robust, scalable solution.

## Architecture

- **Socket.IO Server**: Runs on port 3001 (configurable via `SOCKETIO_PORT`)
- **Redis/Valkey**: Used as adapter for horizontal scaling
- **Next.js App**: Main application on port 3000

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install:
- `socket.io` - Server
- `socket.io-client` - Client
- `@socket.io/redis-adapter` - Redis adapter for scaling
- `ioredis` - Redis client (already installed)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Socket.IO Configuration
SOCKETIO_URL=http://localhost:3001  # Optional: explicit Socket.IO URL
SOCKETIO_PORT=3001                  # Socket.IO server port

# Redis/Valkey Configuration (for Socket.IO adapter)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                    # Optional
REDIS_DB=0
```

### 3. Start Valkey/Redis

**Using Docker:**
```bash
docker run -d -p 6379:6379 --name valkey valkey/valkey:7.2-alpine
```

**Or using Redis:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Local installation:**
- macOS: `brew install valkey` or `brew install redis`
- Ubuntu: `sudo apt install valkey-server` or `sudo apt install redis-server`

### 4. Start Services

**Development (separate terminals):**

Terminal 1 - Next.js:
```bash
pnpm dev
```

Terminal 2 - Socket.IO Server:
```bash
pnpm socketio:server
```

**Using Docker Compose:**
```bash
docker-compose up
```

This starts:
- Valkey on port 6379
- Next.js app on port 3000
- Socket.IO server on port 3001

## Production Deployment

### Option 1: Separate Containers (Recommended)

Deploy Socket.IO server as a separate service:

1. Build Socket.IO server image:
```bash
docker build -f Dockerfile.socketio -t desifans-socketio .
```

2. Run with environment variables pointing to your Valkey/Redis instance

### Option 2: Process Manager

Use PM2 or similar to run both processes:

```bash
pm2 start pnpm --name "nextjs" -- start
pm2 start pnpm --name "socketio" -- socketio:server
```

### Environment Variables for Production

```env
SOCKETIO_URL=https://socketio.yourdomain.com
SOCKETIO_PORT=3001
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Features

- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Message read receipts
- ✅ Horizontal scaling via Redis adapter
- ✅ Automatic reconnection
- ✅ Push notifications for offline users
- ✅ Call notifications (integrated with LiveKit)

## Troubleshooting

### Socket.IO not connecting

1. Check Socket.IO server is running: `pnpm socketio:server`
2. Verify port is accessible: `curl http://localhost:3001`
3. Check browser console for connection errors
4. Verify CORS settings in `scripts/socketio-server.ts`

### Redis adapter not working

1. Verify Valkey/Redis is running: `redis-cli ping` (should return PONG)
2. Check connection settings in environment variables
3. Review server logs for Redis connection errors
4. Socket.IO will continue without adapter (single server mode) if Redis is unavailable

### Messages not being delivered

1. Check user is authenticated (Socket.IO requires valid session)
2. Verify conversation exists and user is a participant
3. Check server logs for errors
4. Ensure Socket.IO server has access to database

## Migration from WebSocket

The old WebSocket implementation has been removed. All components now use Socket.IO through the same interface:

- `useWebSocketContext()` - React hook (unchanged API)
- Message types remain the same
- No changes needed in chat components

## API

### Client → Server Events

- `message:send` - Send a chat message
- `message:read` - Mark message as read
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `ping` - Keepalive ping

### Server → Client Events

- `message` - Generic message event containing:
  - `message:send` - New message received
  - `message:received` - Message confirmation
  - `message:read` - Message read notification
  - `typing:start` - User typing indicator
  - `typing:stop` - User stopped typing
  - `call:initiate` - Incoming call
  - `call:accept` - Call accepted
  - `call:reject` - Call rejected
  - `call:end` - Call ended
  - `error` - Error message
  - `pong` - Keepalive response

## Performance

- Supports horizontal scaling with multiple Socket.IO server instances
- Redis adapter ensures messages are delivered across all instances
- Automatic reconnection handles network issues
- Efficient message routing via user socket mapping

