# DesiFans Platform Documentation

**Version:** 0.0.1  
**Last Updated:** December 30, 2025

## Overview

DesiFans is a creator-fan monetization platform built with Next.js 16, React 19, and TypeScript. It enables creators to monetize their content through memberships, exclusive posts, and services (shoutouts, audio/video calls, and chat).

## Platform Type

**Creator Monetization & Fan Engagement Platform**

This is a comprehensive SaaS platform designed for creators to:

- Build and engage with their fanbase
- Monetize content through subscriptions and one-time purchases
- Offer personalized services to fans
- Manage memberships and exclusive content
- Communicate with fans through messaging and broadcasts

## Tech Stack

### Frontend

- **Framework:** Next.js 16 with App Router
- **React:** Version 19.1.0
- **TypeScript:** Type-safe development
- **Styling:** Tailwind CSS v4 with custom design system
- **UI Components:** Radix UI + shadcn/ui
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod validation

### Backend

- **Runtime:** Node.js with Next.js API Routes
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Better Auth (Google OAuth)
- **File Storage:** Cloudflare R2 (S3-compatible)
- **Video Processing:** BullMQ + Redis queue system
- **Push Notifications:** Firebase Cloud Messaging
- **Real-time:** LiveKit (audio/video calls)

### Infrastructure

- **Deployment:** Railway / Vercel
- **CDN:** Cloudflare
- **Queue System:** Redis + BullMQ
- **Video Streaming:** HLS (HTTP Live Streaming)

## Key Features

### For Creators

1. **Multi-tier Memberships** - Offer different subscription levels
2. **Content Management** - Post images, videos, and text content
3. **Exclusive Posts** - One-time purchase content
4. **Services** - Shoutouts, audio/video calls, chat sessions
5. **Broadcasting** - Send messages to followers
6. **Analytics Dashboard** - Track revenue, followers, and engagement
7. **Payout Management** - View and manage earnings

### For Fans

1. **Discover Creators** - Browse and follow creators
2. **Subscribe** - Access to subscription-based content
3. **Purchase Content** - Buy exclusive posts
4. **Book Services** - Schedule calls, request shoutouts
5. **Inbox** - Direct messaging with creators
6. **Push Notifications** - Real-time updates

## Documentation Structure

This documentation is organized into the following sections:

1. **[Architecture](./architecture.md)** - System architecture and design patterns
2. **[Database Schema](./schema.md)** - Complete database schema documentation
3. **[Features](./features.md)** - Detailed feature documentation
4. **[Pages & Routes](./pages.md)** - All available routes and pages
5. **[Forms & Validation](./forms.md)** - Form fields and validation rules
6. **[API Reference](./api-reference.md)** - API endpoints and usage
7. **[Environment Setup](./environment.md)** - Configuration and deployment
8. **[Development Guide](./development.md)** - Getting started with development

## Quick Links

- [Getting Started](./development.md#getting-started)
- [Database Schema](./schema.md)
- [API Endpoints](./api-reference.md)
- [Form Fields Reference](./forms.md)
- [Deployment Guide](./environment.md#deployment)

## Project Metadata

- **Repository:** balajimalathi/of
- **License:** MIT
- **Language:** TypeScript
- **Package Manager:** pnpm
