# Environment & Setup Guide

This guide covers the environment variables, local setup, and deployment process for DesiFans.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the following values:

### App URL

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database (PostgreSQL)

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Authentication (Better Auth)

```bash
BETTER_AUTH_SECRET="your-random-secret-string"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Cloudflare R2 (Storage)

```bash
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="your-bucket-name"
CLOUDFLARE_R2_PUBLIC_URL="https://your-public-bucket-url"
```

### Redis (For Job Queue)

```bash
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

### LiveKit (Real-time Audio/Video)

```bash
LIVEKIT_URL="wss://your-project.livekit.cloud"
LIVEKIT_API_KEY="your-api-key"
LIVEKIT_API_SECRET="your-api-secret"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-project.livekit.cloud"
```

### Firebase (Push Notifications)

```bash
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PRIVATE_KEY="your-private-key"
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="..."
```

### Payment Gateway

```bash
PAYMENT_GATEWAY_ENABLED="true"
PAYMENT_GATEWAY_TYPE="paytm" # or ccbill, epoch, segpay
PAYMENT_GATEWAY_API_KEY="..."
PAYMENT_GATEWAY_SECRET_KEY="..."
PAYMENT_GATEWAY_MERCHANT_ID="..."
PAYMENT_GATEWAY_WEBHOOK_SECRET="..."
PAYMENT_GATEWAY_MODE="test"
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL
- Redis (Optional, required for video processing)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd desifans
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup Database**

   ```bash
   # Push schema to database
   pnpm db:push
   ```

4. **Start Development Server**

   ```bash
   pnpm dev
   ```

5. **Start Video Worker (Optional)**
   Open a new terminal and run:

   ```bash
   pnpm worker:video
   ```

---

## Deployment

### Recommended Stack

- **Frontend/API:** Railway / Vercel
- **Database:** Railway / Neon / Supabase
- **Queue/Worker:** Railway (Node.js Worker)
- **Storage:** Cloudflare R2

### Deploying to Railway

1. **Connect Repository** to Railway
2. **Add Services:**
   - PostgreSQL
   - Redis
   - Next.js App (run `pnpm build && pnpm start`)
   - Worker Service (run `pnpm worker:video`)
3. **Configure Variables**
   - Copy all env vars to Railway variables
4. **Deploy**

### Database Migrations

On production, use `db:migrate` instead of `db:push` for safer schema updates.

```bash
pnpm db:migrate
```

### Build Command

```bash
pnpm build
```

### Start Command

```bash
pnpm start
```
