# Pages & Routing Structure

This document outlines the file structure and routing of the Next.js App Router application.

## Directory Structure

### `app` (Root App Directory)

#### `(home)` - Main Application Layout

Authenticated user interface with sidebar/navigation.

| Route | File Path | Description | Access |
|-------|-----------|-------------|--------|
| `/home` | `(home)/home/page.tsx` | Creator Dashboard / Main Feed | Private |
| `/home/feed` | `(home)/home/feed/page.tsx` | Content Feed | Private |
| `/home/create` | `(home)/home/create/page.tsx` | Create Post Page | Private (Creator) |
| `/home/inbox` | `(home)/home/inbox/page.tsx` | Messages/Chat | Private |
| `/home/my-app` | `(home)/home/my-app/page.tsx` | App Settings/Overview | Private |
| `/home/notifications` | `(home)/home/notifications/page.tsx` | Notifications List | Private |
| `/home/notifications/send` | `(home)/home/notifications/send/page.tsx` | Send Broadcast | Private (Creator) |

#### `(auth)` - Authentication Group

Public authentication pages.

| Route | File Path | Description | Access |
|-------|-----------|-------------|--------|
| `/login` | `(auth)/login/page.tsx` | Login Page | Public |
| `/signup` | `(auth)/signup/page.tsx` | Registration Page | Public |
| `/verify-email` | `(auth)/verify-email/page.tsx` | Email Verification | Public |
| `/onboarding` | `(auth)/onboarding/page.tsx` | Creator Onboarding Wizard | Private (New User) |

#### `(app)` - Public User Pages

Publicly accessible content pages.

| Route | File Path | Description | Access |
|-------|-----------|-------------|--------|
| `/u/[username]` | `(app)/u/[username]/page.tsx` | Public Creator Profile | Public |
| `/creator/dashboard` | `(app)/creator/dashboard/page.tsx` | Advanced Creator Analytics | Private (Creator) |

#### `(landing)` - Marketing Pages

Landing page and marketing content.

| Route | File Path | Description | Access |
|-------|-----------|-------------|--------|
| `/` | `(landing)/page.tsx` | Landing Page | Public |

#### `(docs)` - Documentation

Project documentation or user guides.

| Route | File Path | Description | Access |
|-------|-----------|-------------|--------|
| `/docs` | `(docs)/docs/[[...slug]]/page.tsx` | Documentation Viewer | Public |

#### `api` - Backend API Routes

Server-side endpoints.

| Route | Folder | Description |
|-------|--------|-------------|
| `/api/auth/*` | `api/auth` | Authentication endpoints |
| `/api/posts/*` | `api/posts` | Post operations (create, like, comment) |
| `/api/creator/*` | `api/creator` | Creator management |
| `/api/memberships/*` | `api/memberships` | Membership management |
| `/api/payments/*` | `api/payments` | Payment processing & webhooks |
| `/api/services/*` | `api/services` | Service management |
| `/api/onboarding/*` | `api/onboarding` | Onboarding steps |
| `/api/video/*` | `api/video` | Video upload & status |

---

## Key Components per Page

### `/home` (Dashboard)

- `DashboardStats`
- `RecentSales`
- `OnboardingChecklist`
- `RevenueChart`

### `/home/create` (Create Post)

- `ImageUpload`
- `VideoUpload`
- `FollowerSelector` (for broadcast)

### `/u/[username]` (Profile)

- `ProfileHeader`
- `MembershipCard` (List)
- `ServiceCard` (List)
- `PostFeed` (Filtered by creator)

### `/auth/onboarding`

- `OnboardingWizard` (Multi-step form)

---

## Layouts

### Root Layout (`app/layout.tsx`)

- Providers (Theme, Auth, Toast)
- Global fonts
- Metadata

### Home Layout (`app/(home)/layout.tsx`)

- `AppSidebar` (Navigation)
- `Header` (Mobile toggle, Breadcrumbs. UserNav)
- `ContentArea`

### Auth Layout (`app/(auth)/layout.tsx`)

- Centered container
- Simple branding

---

## Navigation Structure

### Sidebar Navigation

- **Home:** `/home`
- **Inbox:** `/home/inbox`
- **Create:** `/home/create`
- **Explore:** `/home/feed`
- **Notifications:** `/home/notifications`
- **Settings:** `/home/my-app`

### Profile Navigation

Tabs on `/u/[username]`:

- **Posts:** Default view
- **Memberships:** View/Purchase plans
- **Services:** View/Book services
- **About:** Bio and details

---

## Middleware (`middleware.ts`)

- Checks authentication token
- Protects private routes (`/home/*`)
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from auth pages
- Handles API route protection
