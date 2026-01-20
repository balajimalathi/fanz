# Exclusivz Web (DesiFans)

**Exclusivz Web** (also known as DesiFans) is a comprehensive content creator platform designed to empower creators with subscriptions, exclusive content, live streaming, and direct audience interaction tools. Built with modern web technologies, it offers a scalable and high-performance alternative to traditional creator platforms.

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database**: PostgreSQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better-Auth](https://better-auth.com/)
- **Real-time & Video**: [LiveKit](https://livekit.io/)
- **Payments**: Dodo Payments
- **Background Jobs**: [BullMQ](https://bullmq.io/) & Redis
- **Motion**: Framer Motion

## ✨ Key Features

- **Creator Profiles**: Customizable implementation of creator pages with bios, categories, and social links.
- **Subscriptions**: Monthly recurring subscriptions managed via Dodo Payments.
- **Exclusive Content**:
  - **Paid Posts**: Unlockable photo and video content.
  - **Subscriber-Only**: Content visible only to active subscribers.
- **Live Streaming**: High-quality, real-time streaming powered by LiveKit (Free, Sub-only, or Pay-per-view).
- **Video Processing**:
  - HLS Streaming support for uploaded videos.
  - Background processing via BullMQ workers.
  - See [README-VIDEO-PROCESSING.md](README-VIDEO-PROCESSING.md) for details.
- **Interactions**:
  - **One-on-One Calls**: Paid audio and video calls.
  - **Direct Messages**: Paid DM system (Work in Progress).
  - **Shoutouts**: Custom service requests.
- **Analytics**: Detailed revenue, subscriber, and engagement metrics.

## 🛠️ Prerequisites

Ensure you have the following installed:

- **Node.js** v20+
- **pnpm** (Package Manager)
- **PostgreSQL** (Database)
- **Redis** (For background jobs/queues)

## 🏁 Getting Started

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd exclusivz-web
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Environment Setup**

    Copy the example environment file:

    ```bash
    cp .env.example .env.local
    ```

    Fill in your credentials for Database, LiveKit, Better-Auth, Dodo Payments, etc.

4. **Database Setup**

    Push the schema to your database:

    ```bash
    pnpm db:push
    ```

5. **Run Development Server**

    ```bash
    pnpm dev
    ```

    The app will be available at `http://localhost:3000`.

## 👷 Background Workers

Video processing and other background tasks handling require running a worker process.

```bash
pnpm worker:video
```

*Make sure Redis is running before starting the worker.*

## 📚 Documentation

- **[Admin Tables Guide](README-ADMIN-TABLES.md)**: Details on database tables and admin management.
- **[Video Processing](README-VIDEO-PROCESSING.md)**: Architecture for video uploads and HLS conversion.
- **[Logging Setup](LOGGING-SETUP.md)**: Configuration for application logging.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

[MIT](LICENSE)
