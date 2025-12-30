# Forms & Validation Documentation

This document details all forms, form fields, validation rules, and user inputs across the DesiFans platform.

## Form Libraries

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Integration between React Hook Form and Zod

## Table of Contents

1. [Authentication Forms](#authentication-forms)
2. [Onboarding Forms](#onboarding-forms)
3. [Creator Profile Forms](#creator-profile-forms)
4. [Content Creation Forms](#content-creation-forms)
5. [Membership & Service Forms](#membership--service-forms)
6. [Payment Forms](#payment-forms)
7. [Communication Forms](#communication-forms)

---

## Authentication Forms

### Login Form

**Location:** `app/(auth)/login/page.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `email` | email | Valid email format | User's email address |
| `password` | password | Min 8 characters | User's password |

**Submit:** Redirects to `/home` on success

**Social Auth:**

- Google OAuth (via Better Auth)

---

### Signup Form

**Location:** `app/(auth)/signup/page.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `name` | text | Required, max 100 chars | Full name |
| `email` | email | Valid email, unique | Email address |
| `password` | password | Min 8 chars | Password |
| `confirmPassword` | password | Must match password | Password confirmation |

**Submit:** Creates account and redirects to email verification

---

### Email Verification

**Location:** `app/(auth)/verify-email/page.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `code` | text | 6-digit code | Verification code sent to email |

---

## Onboarding Forms

### Onboarding Wizard

**Location:** `components/onboarding/onboarding-wizard.tsx`

**Total Steps:** 8

**Validation Schema:**

```typescript
{
  country: string (min 1),
  creatorType: enum ["ai", "human"],
  contentType: enum ["18+", "general"],
  username: string (3-30 chars, alphanumeric + hyphens/underscores),
  displayName: string (1-100 chars),
  gender: enum ["male", "female", "non-binary", "prefer-not-to-say", "other"],
  dateOfBirth: string (must be 18+ years old),
  categories: array of strings (min 1 category)
}
```

#### Step 1: Country

| Field Name | Type | Validation | Options |
|------------|------|------------|---------|
| `country` | select | Required | List of countries (see COUNTRIES constant) |

#### Step 2: Creator Type

| Field Name | Type | Validation | Options |
|------------|------|------------|---------|
| `creatorType` | radio | Required | `ai`, `human` |

#### Step 3: Content Type

| Field Name | Type | Validation | Options |
|------------|------|------------|---------|
| `contentType` | radio | Required | `18+`, `general` |

#### Step 4: Username

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `username` | text | 3-30 chars, alphanumeric + hyphens/underscores, unique | Unique username for profile URL |

**Real-time Validation:**

- Client-side: Regex pattern check
- Server-side: Uniqueness check (debounced 500ms)
- Shows loading spinner during validation

#### Step 5: Display Name

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `displayName` | text | 1-100 chars, required | Public display name |

#### Step 6: Gender

| Field Name | Type | Validation | Options |
|------------|------|------------|---------|
| `gender` | select | Required | `male`, `female`, `non-binary`, `prefer-not-to-say`, `other` |

#### Step 7: Date of Birth

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `dateOfBirth` | date | Must be 18+ years old | Date of birth for age verification |

**Validation Logic:**

```typescript
const isAdult = (dob: Date): boolean => {
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  
  return age >= 18;
}
```

#### Step 8: Categories

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `categories` | multi-select badges | Min 1 category | Creator categories/interests |

**Available Categories:**
See `types/onboarding.ts` for full list

**Features:**

- Progress bar showing completion percentage
- Auto-save on each step
- Resume from last completed step
- Locked username after onboarding

---

## Creator Profile Forms

### Profile Editor

**Location:** `components/creator/profile-card.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `displayName` | text | 1-100 chars | Display name |
| `bio` | textarea | Max 500 chars | Creator bio |
| `profileImageUrl` | file upload | Image formats (jpg, png, webp) | Profile picture |
| `profileCoverUrl` | file upload | Image formats | Cover/banner image |
| `country` | select | Required | Country (cannot change after onboarding) |
| `gender` | select | Required | Gender (cannot change after onboarding) |
| `categories` | multi-select | Min 1 | Categories |

**Image Processing:**

- Profile image: Cropped to square, max 2MB
- Cover image: 16:9 aspect ratio, max 5MB
- Automatic compression and optimization

**Locked Fields (cannot be edited after onboarding):**

- `username`
- `creatorType`
- `contentType`
- `dateOfBirth`

---

### Bank Account Details

**Location:** Creator Dashboard / Settings

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `pan` | text | 10 chars alphanumeric | PAN card number |
| `accountNumber` | text | 9-18 digits | Bank account number |
| `ifscCode` | text | 11 chars alphanumeric | IFSC code |
| `bankName` | text | Required | Bank name |
| `accountHolderName` | text | Required | Account holder name |
| `branchName` | text | Required | Branch name |
| `accountType` | radio | Required | `savings` or `current` |

**Security:**

- Stored encrypted in database
- Only last 4 digits shown in UI
- Requires re-authentication to view/edit

---

## Content Creation Forms

### Create Post Form

**Location:** `app/(home)/home/create/page.tsx`

**Validation Schema:**

```typescript
{
  caption?: string (max 5000 chars),
  postType: enum ["subscription", "exclusive"],
  membershipIds?: string[] (required if postType = "subscription"),
  price?: number (required if postType = "exclusive", min 0),
  images: File[] (max 10 images),
  videos: File[] (max 1 video)
}
```

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `images` | file upload (multiple) | Max 10 files, image formats, max 10MB each | Post images |
| `videos` | file upload | Max 1 file, video formats, max 500MB | Post video |
| `caption` | textarea | Max 5000 chars | Post caption |
| `postType` | radio | Required | `subscription` or `exclusive` |
| `membershipIds` | checkbox list | Required if subscription | Select which memberships can access |
| `price` | number | Required if exclusive, min 0 | Price in Rupees for exclusive posts |

**Conditional Logic:**

- If `postType === "subscription"`:
  - Show membership selection (required)
  - Hide price field
- If `postType === "exclusive"`:
  - Show price field (required)
  - Hide membership selection

**Media Upload:**

- Images: jpg, jpeg, png, webp, gif
- Videos: mp4, mov, avi, mkv, webm
- Automatic thumbnail generation for videos
- Progress indicator during upload
- Video processing queue (BullMQ)

**Post Actions (after publishing):**

- Pin/Unpin post
- Send push notifications to followers
- Copy shareable link
- Broadcast to selected followers

---

### Image Upload Component

**Location:** `components/post/image-upload.tsx`

**Features:**

- Drag & drop support
- Multiple file selection
- Preview thumbnails
- Reorder images (affects display order)
- Remove individual images
- Max file size: 10MB per image
- Max total images: 10

**Supported Formats:** jpg, jpeg, png, webp, gif

---

### Video Upload Component

**Location:** `components/post/video-upload.tsx`

**Features:**

- Single video upload
- Video preview
- Upload progress bar
- Processing status:
  - `pending` - Not yet uploaded
  - `uploading` - Upload in progress
  - `processing` - Server-side processing (transcoding)
  - `ready` - Video ready
  - `error` - Upload/processing failed

**Processing:**

1. Upload to Cloudflare R2
2. Queue video processing job (BullMQ)
3. FFmpeg transcoding to HLS
4. Generate thumbnails
5. Update post media record

**Supported Formats:** mp4, mov, avi, mkv, webm

**Max File Size:** 500MB

---

## Membership & Service Forms

### Create Membership Form

**Location:** `components/creator/membership-card.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `title` | text | Max 100 chars, required | Membership tier name |
| `description` | textarea | Max 500 chars, required | Membership benefits description |
| `monthlyRecurringFee` | number | Min 0, required | Monthly fee in Rupees |
| `coverImageUrl` | file upload | Image formats, max 5MB | Membership card image |
| `visible` | checkbox | Boolean | Whether visible to fans |

**Validation:**

```typescript
{
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  monthlyRecurringFee: z.number().min(0),
  coverImageUrl: z.string().url().optional(),
  visible: z.boolean().default(true)
}
```

---

### Create Service Form

**Location:** `components/creator/service-card.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `name` | text | Max 100 chars, required | Service name |
| `description` | textarea | Max 500 chars, required | Service description |
| `serviceType` | select | Required | `shoutout`, `audio_call`, `video_call`, `chat` |
| `price` | number | Min 0, required | Price in Rupees |
| `durationMinutes` | number | Min 5, max 180 | Service duration (default 30) |
| `visible` | checkbox | Boolean | Visibility status |

**Validation:**

```typescript
{
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  serviceType: z.enum(["shoutout", "audio_call", "video_call", "chat"]),
  price: z.number().min(0),
  durationMinutes: z.number().min(5).max(180).default(30),
  visible: z.boolean().default(true)
}
```

**Service Type Descriptions:**

- **Shoutout:** Video message from creator
- **Audio Call:** Voice call with creator
- **Video Call:** Video call with creator
- **Chat:** Text chat session with creator

---

## Payment Forms

### Membership Subscription

**Location:** `components/creator/membership-display-card.tsx`

**Flow:**

1. Click "Subscribe" button
2. Redirect to payment gateway (DodoPay)
3. Complete payment
4. Webhook updates subscription status
5. User gains access to subscription content

**Gateway Integration:** DodoPay

---

### Exclusive Post Purchase

**Location:** Post detail page

**Flow:**

1. View blurred post preview
2. Click "Unlock for ₹X"
3. Payment gateway checkout
4. Payment success → post unlocked
5. Record created in `postPurchase` table

---

### Service Booking

**Location:** `components/creator/service-display-card.tsx`

**Flow:**

1. Select service
2. Payment gateway checkout
3. Service order created (status: `pending`)
4. Payment success → status: `active`
5. Creator fulfills service → status: `fulfilled`

**Additional Fields (service-specific):**

- Shoutout: Who it's for, custom message
- Calls: Preferred time slot
- Chat: Initial message

---

## Communication Forms

### Inbox Message Form

**Location:** `app/(home)/home/inbox/inbox-client.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `message` | textarea | Max 1000 chars, required | Message text |
| `attachments` | file upload | Image/video/audio formats | Media attachments |

**Message Types:**

- Text
- Image (jpg, png, webp)
- Video (mp4, webm)
- Audio (mp3, wav, ogg)

**Features:**

- Real-time message updates
- Read receipts
- Typing indicators
- Unread count badges

---

### Broadcast Message Form

**Location:** `components/post/follower-selector.tsx`

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `followerIds` | multi-select | Min 1, max 1000 | Select followers to notify |
| `messageType` | select | Required | `text`, `audio`, `image`, `video` |
| `content` | textarea | Required if text | Message content |
| `mediaUrl` | file upload | Required if media type | Media file |

**Flow:**

1. After creating post, click "Broadcast"
2. Select followers from list (searchable)
3. Compose message
4. Send to selected followers
5. Creates notification records
6. Sends push notifications

**Limits:**

- Max 1000 recipients per broadcast
- Rate limited: 1 broadcast per 5 minutes per creator

---

### Notification Settings Form

**Location:** User settings page

**Fields:**

| Field Name | Type | Validation | Description |
|------------|------|------------|-------------|
| `enabled` | checkbox | Boolean | Enable/disable all notifications |
| `newPost` | checkbox | Boolean | Notify on new posts from followed creators |
| `newFollower` | checkbox | Boolean | Notify when someone follows you |
| `comment` | checkbox | Boolean | Notify on post comments |
| `like` | checkbox | Boolean | Notify on post likes |
| `message` | checkbox | Boolean | Notify on new messages |
| `serviceOrder` | checkbox | Boolean | Notify on service bookings |

---

## Validation Utilities

### Common Validators

**Location:** `lib/validations/`

#### Post Validation

```typescript
// lib/validations/post.ts
export const postSchema = z.object({
  caption: z.string().max(5000).optional(),
  postType: z.enum(["subscription", "exclusive"]),
  membershipIds: z.array(z.string().uuid()).optional(),
  price: z.number().min(0).optional(),
});
```

#### Membership Validation

```typescript
// lib/validations/membership.ts
export const membershipSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  monthlyRecurringFee: z.number().min(0),
  visible: z.boolean().default(true),
});
```

#### Service Validation

```typescript
// lib/validations/service.ts
export const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  serviceType: z.enum(["shoutout", "audio_call", "video_call", "chat"]),
  price: z.number().min(0),
  durationMinutes: z.number().min(5).max(180).default(30),
  visible: z.boolean().default(true),
});
```

---

## Form Behavior & UX

### Auto-save

Forms with auto-save functionality:

- Onboarding wizard (saves each step)
- Post draft (saves to localStorage every 30 seconds)

### Loading States

All forms implement loading states:

- Disabled fields during submission
- Loading spinner on submit button
- Prevent double submission

### Error Handling

Error display patterns:

- Inline field errors (below input)
- Toast notifications for global errors
- Scroll to first error on validation failure

### Form Reset

Forms that persist data:

- Onboarding wizard (resume from last step)
- Post draft (restore from localStorage)

Forms that clear on submit:

- Messages
- Comments
- Broadcast messages

---

## Accessibility

All forms include:

- Proper label associations
- ARIA attributes
- Keyboard navigation support
- Focus management
- Error announcements for screen readers

---

## Testing Forms

### Validation Testing

Test cases for each form:

1. Empty submission (should show validation errors)
2. Invalid data (should show specific error messages)
3. Valid data (should submit successfully)
4. Edge cases (max lengths, special characters, etc.)

### Example Test Cases

**Username Validation:**

- Empty: ❌ "Username is required"
- Too short (< 3 chars): ❌ "Username must be at least 3 characters"
- Too long (> 30 chars): ❌ "Username must be at most 30 characters"
- Special characters: ❌ "Username can only contain letters, numbers, hyphens, and underscores"
- Already taken: ❌ "Username is already taken"
- Valid: ✅ "Username is available"

**Date of Birth:**

- Under 18: ❌ "You must be at least 18 years old"
- 18 or older: ✅ Valid

---

## Form Field Naming Conventions

### Naming Pattern

- camelCase for field names
- Descriptive and consistent
- Example: `displayName`, `monthlyRecurringFee`, `profileImageUrl`

### Database vs. Form Fields

- Form fields may differ slightly from database column names
- Transformations happen in validation schemas
- Example: Form uses Rupees, database stores paise (x100)

---

## File Upload Handling

### Client-side

1. File selection/drag-drop
2. File type validation
3. Size validation
4. Preview generation
5. Upload to server

### Server-side

1. File type verification
2. Size limit enforcement
3. Virus scanning (optional)
4. Upload to Cloudflare R2
5. Generate thumbnails (for images/videos)
6. Return public URL

### Security

- Signed upload URLs
- File type whitelist
- Size limits enforced server-side
- Filename sanitization
- Storage quota limits per creator
