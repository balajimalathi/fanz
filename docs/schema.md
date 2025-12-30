# Database Schema Documentation

This document provides a comprehensive overview of the database schema used in the DesiFans platform.

## Overview

The database uses PostgreSQL with Drizzle ORM for type-safe database operations. All monetary values are stored in **paise** (smallest currency unit, i.e., 1 Rupee = 100 paise).

## Enums

### `creator_type`

- `ai` - AI-generated creator
- `human` - Human creator

### `content_type`

- `18+` - Adult content
- `general` - General audience content

### `post_type`

- `subscription` - Visible to subscribed members
- `exclusive` - One-time purchase content

### `media_type`

- `image` - Image media
- `video` - Video media

### `message_type`

- `text` - Text message
- `audio` - Audio message
- `image` - Image message
- `video` - Video message

### `payment_transaction_type`

- `membership` - Membership subscription payment
- `exclusive_post` - Exclusive post purchase
- `service` - Service booking payment

### `payment_transaction_status`

- `pending` - Payment initiated
- `processing` - Payment being processed
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled

### `service_type`

- `shoutout` - Video shoutout service
- `audio_call` - Audio call service
- `video_call` - Video call service
- `chat` - Chat service

### `service_order_status`

- `pending` - Order created, payment pending
- `active` - Order paid, awaiting fulfillment
- `fulfilled` - Order completed
- `cancelled` - Order cancelled

### `payout_status`

- `pending` - Payout scheduled
- `processing` - Payout in progress
- `completed` - Payout completed
- `failed` - Payout failed

---

## Core Tables

### `user`

**Purpose:** Store all user accounts (both creators and fans)

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PK | User ID (Better Auth generated) |
| `name` | text | NOT NULL | User's full name |
| `email` | text | NOT NULL, UNIQUE | User's email address |
| `emailVerified` | boolean | NOT NULL | Whether email is verified |
| `image` | text | NULL | Profile image URL |
| `createdAt` | timestamp | NOT NULL | Account creation timestamp |
| `updatedAt` | timestamp | NOT NULL | Last update timestamp |
| `role` | text | NULL | User role (admin, etc.) |
| `banned` | boolean | NULL | Whether user is banned |
| `banReason` | text | NULL | Reason for ban |
| `banExpires` | timestamp | NULL | Ban expiration timestamp |

**Relationships:**

- One-to-Many: `session`, `account`, `follower`, `notification`, `postLike`, `postComment`, `pushSubscription`
- One-to-One: `creator` (optional)

---

### `session`

**Purpose:** User session management for authentication

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PK | Session ID |
| `expiresAt` | timestamp | NOT NULL | Session expiration |
| `token` | text | NOT NULL, UNIQUE | Session token |
| `createdAt` | timestamp | NOT NULL | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL | Update timestamp |
| `ipAddress` | text | NULL | IP address |
| `userAgent` | text | NULL | User agent string |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `impersonatedBy` | text | NULL | Admin impersonation tracking |

**Relationships:**

- Many-to-One: `user`

---

### `account`

**Purpose:** OAuth provider accounts linked to users

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PK | Account ID |
| `accountId` | text | NOT NULL | Provider account ID |
| `providerId` | text | NOT NULL | OAuth provider ID (google, etc.) |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `accessToken` | text | NULL | OAuth access token |
| `refreshToken` | text | NULL | OAuth refresh token |
| `idToken` | text | NULL | OAuth ID token |
| `accessTokenExpiresAt` | timestamp | NULL | Access token expiration |
| `refreshTokenExpiresAt` | timestamp | NULL | Refresh token expiration |
| `scope` | text | NULL | OAuth scopes |
| `password` | text | NULL | Hashed password (if using email/password) |
| `createdAt` | timestamp | NOT NULL | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL | Update timestamp |

**Relationships:**

- Many-to-One: `user`

---

### `verification`

**Purpose:** Email verification and password reset tokens

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PK | Verification ID |
| `identifier` | text | NOT NULL | Email / user identifier |
| `value` | text | NOT NULL | Verification token |
| `expiresAt` | timestamp | NOT NULL | Token expiration |
| `createdAt` | timestamp | NULL | Creation timestamp |
| `updatedAt` | timestamp | NULL | Update timestamp |

---

## Creator Tables

### `creator`

**Purpose:** Creator profile information

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PK, FK | References `user.id` |
| `username` | text | UNIQUE | Unique username |
| `displayName` | text | NOT NULL | Display name |
| `country` | text | NULL | Country |
| `creatorType` | enum | NULL | `ai` or `human` |
| `contentType` | enum | NULL | `18+` or `general` |
| `gender` | text | NULL | Gender |
| `dateOfBirth` | timestamp | NULL | Date of birth |
| `categories` | jsonb | NULL | Array of category strings |
| `onboarded` | boolean | NOT NULL, DEFAULT false | Onboarding completion status |
| `usernameLocked` | boolean | NOT NULL, DEFAULT false | Whether username can be changed |
| `subdomain` | text | UNIQUE | Custom subdomain |
| `onboardingStep` | integer | DEFAULT 0 | Current onboarding step |
| `onboardingData` | jsonb | NULL | Temporary onboarding data |
| `profileImageUrl` | text | NULL | Profile image URL |
| `profileCoverUrl` | text | NULL | Cover image URL |
| `bio` | text | NULL | Creator bio |
| `bankAccountDetails` | jsonb | NULL | Bank account information (encrypted) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Bank Account Details Schema (JSONB):**

```typescript
{
  pan?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  accountHolderName?: string;
  branchName?: string;
  accountType?: "savings" | "current";
  verified?: boolean;
}
```

**Relationships:**

- One-to-One: `user`
- One-to-Many: `membership`, `service`, `post`, `follower`, `paymentTransaction`, `payout`

---

### `membership`

**Purpose:** Creator membership tiers/subscription plans

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Membership ID |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `title` | text | NOT NULL | Membership title |
| `description` | text | NOT NULL | Membership description |
| `monthlyRecurringFee` | integer | NOT NULL, DEFAULT 0 | Monthly fee in paise |
| `visible` | boolean | NOT NULL, DEFAULT true | Whether visible to fans |
| `coverImageUrl` | text | NULL | Cover image URL |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Relationships:**

- Many-to-One: `creator`
- Many-to-Many: `post` (through `postMembership`)

---

### `service`

**Purpose:** Services offered by creators

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Service ID |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `name` | text | NOT NULL | Service name |
| `description` | text | NOT NULL | Service description |
| `price` | integer | NOT NULL, DEFAULT 0 | Price in paise |
| `serviceType` | enum | NOT NULL | Type of service |
| `durationMinutes` | integer | DEFAULT 30 | Service duration |
| `visible` | boolean | NOT NULL, DEFAULT true | Visibility status |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Relationships:**

- Many-to-One: `creator`
- One-to-Many: `serviceOrder`

---

## Content Tables

### `post`

**Purpose:** Creator posts (images/videos)

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Post ID |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `caption` | text | NULL | Post caption |
| `postType` | enum | NOT NULL | `subscription` or `exclusive` |
| `price` | integer | NULL | Price in paise (for exclusive posts) |
| `isPinned` | boolean | NOT NULL, DEFAULT false | Whether pinned to profile |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Relationships:**

- Many-to-One: `creator`
- One-to-Many: `postMedia`, `postLike`, `postComment`
- Many-to-Many: `membership` (through `postMembership`)

---

### `postMedia`

**Purpose:** Media files attached to posts

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Media ID |
| `postId` | uuid | NOT NULL, FK | References `post.id` |
| `mediaType` | enum | NOT NULL | `image` or `video` |
| `url` | text | NOT NULL | Media URL |
| `thumbnailUrl` | text | NULL | Thumbnail URL |
| `hlsUrl` | text | NULL | HLS stream URL (for videos) |
| `blurThumbnailUrl` | text | NULL | Blurred thumbnail for paywalled content |
| `metadata` | jsonb | NULL | Additional metadata |
| `orderIndex` | integer | NOT NULL, DEFAULT 0 | Display order |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Upload timestamp |

**Relationships:**

- Many-to-One: `post`

---

### `postMembership`

**Purpose:** Link posts to membership tiers (junction table)

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `postId` | uuid | PK, FK | References `post.id` |
| `membershipId` | uuid | PK, FK | References `membership.id` |

**Composite Primary Key:** `(postId, membershipId)`

---

### `postLike`

**Purpose:** Post likes

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Like ID |
| `postId` | uuid | NOT NULL, FK | References `post.id` |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Like timestamp |

**Unique Constraint:** `(postId, userId)`

---

### `postComment`

**Purpose:** Post comments (with nested replies)

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Comment ID |
| `postId` | uuid | NOT NULL, FK | References `post.id` |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `content` | text | NOT NULL | Comment text |
| `parentCommentId` | uuid | NULL, FK | References `postComment.id` (for replies) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Relationships:**

- Self-referencing for nested comments/replies

---

## Payment Tables

### `customers`

**Purpose:** Payment gateway customer records

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Customer ID |
| `email` | varchar(255) | NOT NULL, UNIQUE | Customer email |
| `name` | varchar(255) | NULL | Customer name |
| `dodoCustomerId` | varchar(255) | NULL | DodoPay customer ID |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |

---

### `subscriptions`

**Purpose:** Active membership subscriptions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Subscription ID |
| `customerId` | uuid | NOT NULL, FK | References `customers.id` |
| `planId` | varchar(255) | NOT NULL | Membership ID as string |
| `status` | varchar(50) | NOT NULL, DEFAULT 'active' | Subscription status |
| `currentPeriodStart` | timestamp | NULL | Billing period start |
| `currentPeriodEnd` | timestamp | NULL | Billing period end |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Unique Constraint:** `(customerId, planId)`

---

### `paymentTransaction`

**Purpose:** All payment transactions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Transaction ID |
| `userId` | text | NOT NULL, FK | References `user.id` (payer) |
| `creatorId` | text | NOT NULL, FK | References `creator.id` (payee) |
| `type` | enum | NOT NULL | Transaction type |
| `entityId` | uuid | NOT NULL | ID of membership/post/service |
| `amount` | integer | NOT NULL | Total amount in paise |
| `platformFee` | integer | NOT NULL | Platform fee (10%) in paise |
| `creatorAmount` | integer | NOT NULL | Creator earnings (90%) in paise |
| `status` | enum | NOT NULL, DEFAULT 'pending' | Payment status |
| `gatewayTransactionId` | text | NULL | Payment gateway transaction ID |
| `metadata` | jsonb | NULL | Additional metadata |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

**Relationships:**

- Many-to-One: `user`, `creator`

---

### `postPurchase`

**Purpose:** Track exclusive post purchases

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Purchase ID |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `postId` | uuid | NOT NULL, FK | References `post.id` |
| `transactionId` | uuid | NOT NULL, FK | References `paymentTransaction.id` |
| `purchasedAt` | timestamp | NOT NULL, DEFAULT NOW | Purchase timestamp |

**Unique Constraint:** `(userId, postId)`

---

### `payout`

**Purpose:** Creator payouts

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Payout ID |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `periodStart` | timestamp | NOT NULL | Payout period start |
| `periodEnd` | timestamp | NOT NULL | Payout period end |
| `totalAmount` | integer | NOT NULL | Total earnings in paise |
| `platformFee` | integer | NOT NULL | Total platform fee in paise |
| `netAmount` | integer | NOT NULL | Net payout amount in paise |
| `status` | enum | NOT NULL, DEFAULT 'pending' | Payout status |
| `processedAt` | timestamp | NULL | Processing timestamp |
| `metadata` | jsonb | NULL | Additional metadata |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

---

### `payoutItem`

**Purpose:** Individual transactions included in a payout

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Item ID |
| `payoutId` | uuid | NOT NULL, FK | References `payout.id` |
| `transactionId` | uuid | NOT NULL, FK | References `paymentTransaction.id` |
| `amount` | integer | NOT NULL | Creator amount for this transaction |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |

---

## Service & Communication Tables

### `serviceOrder`

**Purpose:** Service bookings

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Order ID |
| `userId` | text | NOT NULL, FK | References `user.id` (customer) |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `serviceId` | uuid | NOT NULL, FK | References `service.id` |
| `transactionId` | uuid | NOT NULL, FK | References `paymentTransaction.id` |
| `status` | enum | NOT NULL, DEFAULT 'pending' | Order status |
| `fulfillmentNotes` | text | NULL | Fulfillment notes |
| `activatedAt` | timestamp | NULL | When service was activated |
| `utilizedAt` | timestamp | NULL | When service was used |
| `customerJoinedAt` | timestamp | NULL | Customer join time (for calls) |
| `creatorJoinedAt` | timestamp | NULL | Creator join time (for calls) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

---

### `conversation`

**Purpose:** Chat conversations linked to service orders

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Conversation ID |
| `serviceOrderId` | uuid | NOT NULL, FK, UNIQUE | References `serviceOrder.id` |
| `creatorId` | text | NOT NULL, FK | References `user.id` |
| `fanId` | text | NOT NULL, FK | References `user.id` |
| `lastMessageAt` | timestamp | NULL | Last message timestamp |
| `unreadCountCreator` | integer | NOT NULL, DEFAULT 0 | Unread count for creator |
| `unreadCountFan` | integer | NOT NULL, DEFAULT 0 | Unread count for fan |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |

**Unique Constraint:** `serviceOrderId`

---

### `message`

**Purpose:** Messages within conversations

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Message ID |
| `conversationId` | uuid | NOT NULL, FK | References `conversation.id` |
| `senderId` | text | NOT NULL, FK | References `user.id` |
| `messageType` | enum | NOT NULL | Message type |
| `content` | text | NULL | Message text content |
| `mediaUrl` | text | NULL | Media URL (for image/video/audio) |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Sent timestamp |

---

### `broadcastMessage`

**Purpose:** Broadcast messages sent to multiple followers

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Broadcast ID |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `followerIds` | jsonb | NOT NULL | Array of follower IDs |
| `messageType` | enum | NOT NULL | Message type |
| `content` | text | NULL | Message text |
| `audioUrl` | text | NULL | Audio message URL |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Sent timestamp |

---

## Social & Notification Tables

### `follower`

**Purpose:** Creator-follower relationships

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Follow ID |
| `followerId` | text | NOT NULL, FK | References `user.id` (follower) |
| `creatorId` | text | NOT NULL, FK | References `creator.id` |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Follow timestamp |

**Unique Constraint:** `(followerId, creatorId)`

---

### `notification`

**Purpose:** In-app notifications

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Notification ID |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `type` | text | NOT NULL | Notification type |
| `title` | text | NOT NULL | Notification title |
| `message` | text | NOT NULL | Notification message |
| `link` | text | NULL | Link to related content |
| `read` | boolean | NOT NULL, DEFAULT false | Read status |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |

---

### `pushSubscription`

**Purpose:** Web push notification subscriptions

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Subscription ID |
| `userId` | text | NOT NULL, FK | References `user.id` |
| `endpoint` | text | NOT NULL, UNIQUE | Push endpoint URL |
| `p256dh` | text | NOT NULL | Push encryption key |
| `auth` | text | NOT NULL | Push auth secret |
| `userAgent` | text | NULL | Device user agent |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

---

### `notificationPreference`

**Purpose:** User notification preferences

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, DEFAULT random | Preference ID |
| `userId` | text | NOT NULL, FK, UNIQUE | References `user.id` |
| `enabled` | boolean | NOT NULL, DEFAULT true | Notifications enabled |
| `createdAt` | timestamp | NOT NULL, DEFAULT NOW | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT NOW | Update timestamp |

---

## Entity Relationship Diagram (ERD)

```
user ──┬─ session
       ├─ account
       ├─ verification (many-to-many via identifier)
       ├─ creator (one-to-one)
       ├─ follower (as follower)
       ├─ notification
       ├─ postLike
       ├─ postComment
       ├─ pushSubscription
       ├─ notificationPreference
       ├─ paymentTransaction (as payer)
       ├─ postPurchase
       ├─ serviceOrder (as customer)
       ├─ conversation (as creator/fan)
       └─ message (as sender)

creator ──┬─ membership
          ├─ service
          ├─ post
          ├─ follower (as creator)
          ├─ paymentTransaction (as payee)
          ├─ payout
          └─ broadcastMessage

post ──┬─ postMedia
       ├─ postMembership
       ├─ postLike
       ├─ postComment
       └─ postPurchase

membership ─── postMembership

service ─── serviceOrder

serviceOrder ──┬─ conversation
               └─ paymentTransaction

paymentTransaction ──┬─ postPurchase
                     ├─ serviceOrder
                     └─ payoutItem

payout ─── payoutItem
```

## Indexes

The schema includes the following automatic indexes:

1. **Primary Keys:** All `id` columns
2. **Foreign Keys:** All relationship columns
3. **Unique Constraints:**
   - `user.email`
   - `creator.username`
   - `creator.subdomain`
   - `session.token`
   - `pushSubscription.endpoint`
   - Composite: `(followerId, creatorId)`, `(postId, userId)` for likes, etc.

## Data Integrity

### Cascade Deletes

- When a user is deleted, all related records (sessions, accounts, posts, etc.) are cascade deleted
- When a creator is deleted, all memberships, services, posts are cascade deleted
- When a post is deleted, all media, likes, comments are cascade deleted

### Default Values

- Timestamps default to `NOW()`
- Boolean fields have appropriate defaults
- Monetary amounts default to 0

## Migration Strategy

Migrations are managed using Drizzle Kit:

- `pnpm db:generate` - Generate migration files
- `pnpm db:push` - Push schema to database
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio (GUI)
