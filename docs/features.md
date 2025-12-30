# Features Documentation

This document describes the core features and functionality of the DesiFans platform.

## Table of Contents

1. [User Roles](#user-roles)
2. [Authentication & Onboarding](#authentication--onboarding)
3. [Creator Profile](#creator-profile)
4. [Content Management](#content-management)
5. [Monetization](#monetization)
6. [Communication](#communication)
7. [Search & Discovery](#search--discovery)
8. [Notifications](#notifications)

---

## User Roles

### Fan (Standard User)

- Can browse creators
- Can follow creators
- Can subscribe to memberships
- Can purchase exclusive content
- Can book services
- Can message creators (if allowed)

### Creator

- All Fan capabilities
- Can create public profile
- Can create memberships
- Can post content (images/videos)
- Can offer services (calls, shoutouts)
- Can view analytics and earnings
- Can broadcast messages to followers

---

## Authentication & Onboarding

### Authentication

- **Provider:** Better Auth (Google OAuth)
- **Session:** Secure session management linked to PostgreSQL
- **Flow:** Login -> OAuth -> Callback -> Dashboard/Onboarding

### Creator Onboarding

A multi-step wizard to set up a new creator profile:

1. **Country Selection** - Determines payout currency (default INR/paise)
2. **Creator Type** - AI or Human creator classification
3. **Content Type** - Adult (18+) or General audience
4. **Username** - Unique handle validation
5. **Display Name** - Public profile name
6. **Gender** - Demographic information
7. **Date of Birth** - Age verification (Must be 18+)
8. **Categories** - Content niches

**Validation:**

- Username uniqueness check
- Age verification check

---

## Creator Profile

### Public Profile Page (`/u/[username]`)

- **Header:** Cover image, Profile picture, Name, Bio, Social links
- **Stats:** Follower count, Post count
- **Tabs:** Posts, Memberships, Services, About
- **Interaction:** Follow/Unfollow button, Message button

### Dashboard

- **Analytics:** Revenue, Subscriber count, Engagement stats
- **Quick Actions:** Create Post, Go Live, Check Inbox
- **Profile Management:** Edit profile details

---

## Content Management

### Posts

- **Types:**
  - **Subscription:** Visible only to specific membership tiers
  - **Exclusive:** One-time purchase required
- **Media:**
  - **Images:** Up to 10 images per post (Gallery view)
  - **Videos:** HLS streaming for smooth playback
- **Features:**
  - Pin to profile
  - Caption support
  - Like & Comment system
  - Shareable links

### Video Processing

- Automatic transcoding to HLS format
- Thumbnail generation
- Background processing via BullMQ worker

---

## Monetization

### Memberships (Subscriptions)

- Create multiple tiered plans
- Set monthly recurring price
- Define tier benefits
- Gate content behind specific tiers

### Exclusive Content

- Pay-per-view posts
- Set individual price for access
- Blurred preview for non-purchasers

### Services

Creators can offer paid services:

1. **Shoutouts:** Personalized video messages
2. **Audio Calls:** Scheduled voice conversations
3. **Video Calls:** Scheduled video meetings
4. **Chat Sessions:** Paid text interaction

### Payments

- **Gateway:** DodoPayments / Razorpay (implied by INR/paise)
- **Currency:** Stored in paise (1/100 INR)
- **Split:**
  - Platform Fee: 10%
  - Creator Earnings: 90%
- **Payouts:** Automated calculations and processing

---

## Communication

### Inbox (Real-time Chat)

- **Technology:** LiveKit / WebSocket integration
- **Features:**
  - Direct messaging between Fan and Creator
  - Text, Image, Video, Audio message support
  - Read receipts
  - Unread counts

### Live Streaming (Planned/Partial)

- Integration with LiveKit for real-time video/audio

### Broadcasting

- Send mass messages to all followers
- Filter by specific follower segments (planned)

---

## Search & Discovery

### Feed

- Personalized feed of posts from followed creators
- Discovery feed for trending content

### Search

- Search creators by username or display name
- Filter by category

### Category Browsing

- Browse creators by tags/categories selected during onboarding

---

## Notifications

### In-App

- New Follower
- New Like/Comment
- New Subscription
- Payment Received
- Service Booking

### Push Notifications

- **Technology:** Firebase Cloud Messaging (FCM)
- Web Push support
- Notifications for messages, lives, and major updates

### Email

- Transactional emails (Receipts, Welcome, Password Reset)

---

## Technical Features

### Video Streaming

Adaptive bitrate streaming using HLS to ensure smooth playback across different network conditions.

### Image Optimization

Automatic resizing, compression, and format conversion (WebP) for fast load times.

### PWA Support

Designed with mobile-first approach, installable as a Progressive Web App.
