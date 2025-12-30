# API Reference

This document outlines the available API endpoints in the DesiFans platform. All API routes are located in `app/api`.

## Authentication

### `GET /api/auth/*`

Handled by Better Auth.

- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/session`
- `/api/auth/callback/[provider]`

---

## Creators

### `GET /api/creator`

Get current user's creator profile.

### `POST /api/creator`

Create or update creator profile.

### `GET /api/creator/[id]`

Get public creator profile by ID or username.

### `GET /api/creator/stats`

Get creator analytics stats (revenue, followers, views).

---

## Onboarding

### `POST /api/onboarding/validate-username`

Check if a username is available.

- **Body:** `{ "username": "string" }`
- **Response:** `{ "valid": boolean, "error": string | null }`

### `POST /api/onboarding/step`

Save progress for a specific onboarding step.

- **Body:** `{ "step": number, "data": object }`

### `POST /api/onboarding/complete`

Finalize onboarding and create creator record.

---

## Posts

### `GET /api/posts`

Get feed of posts. Supports pagination and filtering.

- **Query Params:** `page`, `limit`, `creatorId`, `type`

### `POST /api/posts`

Create a new post.

- **Body:**

```json
{
  "caption": "string",
  "postType": "subscription" | "exclusive",
  "membershipIds": ["uuid"],
  "price": number
}
```

### `GET /api/posts/[id]`

Get single post details.

### `DELETE /api/posts/[id]`

Delete a post.

### `POST /api/posts/[id]/like`

Like/Unlike a post.

### `POST /api/posts/[id]/pin`

Pin/Unpin a post from profile.

### `POST /api/posts/[id]/media`

Upload media (images) for a post (Multipart Form Data).

### `POST /api/posts/[id]/video`

Upload video for a post (Multipart Form Data).

### `POST /api/posts/[id]/broadcast`

Broadcast post to followers.

---

## Memberships

### `GET /api/memberships`

Get all memberships created by the current user.

### `POST /api/memberships`

Create a new membership tier.

- **Body:**

```json
{
  "title": "string",
  "description": "string",
  "monthlyRecurringFee": number,
  "coverImageUrl": "url",
  "visible": boolean
}
```

### `PUT /api/memberships/[id]`

Update a membership tier.

### `DELETE /api/memberships/[id]`

Delete a membership tier.

---

## Services

### `GET /api/services`

Get all services offered by current creator.

### `POST /api/services`

Create a new service.

- **Body:**

```json
{
  "name": "string",
  "description": "string",
  "serviceType": "shoutout" | "call" | "chat",
  "price": number,
  "durationMinutes": number
}
```

### `POST /api/service-orders`

Book a service.

---

## Payments

### `POST /api/payments/checkout`

Create a checkout session for membership or exclusive post.

### `POST /api/payments/webhook`

Handle payment gateway webhooks (status updates).

### `GET /api/payments/transactions`

Get transaction history.

### `GET /api/payments/payouts`

Get payout history.

---

## Push Notifications

### `POST /api/push/subscribe`

Register a push subscription endpoint.

- **Body:** Standard Web Push Subscription object

### `POST /api/push/send`

Send a push notification (Admin/System only).

---

## Video Processing

### `GET /api/video/[id]/status`

Check video processing status.

### `POST /api/video/webhook`

Webhook for video processing completion.

---

## Error Response Format

Standard error response:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Authentication Headers

All private endpoints require the session cookie.
`Cookie: auth_session=...`
