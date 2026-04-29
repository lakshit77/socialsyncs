@AGENTS.md

# SocialSyncs — Project Context

## What Is This Project?

**SocialSyncs** is an open-source, multi-platform social media automation platform built as a Next.js SaaS. It is being developed live on YouTube as a teaching project. Viewers follow along and set up their own instances with their own API credentials.

The platform covers all major social media platforms (Instagram, Facebook, YouTube, and more in the future) and provides:

- **Content posting** (images, videos, carousels, reels, stories)
- **Comment automation** — AI selects suitable comments and replies intelligently
- **DM automation**
- **Story reply automation**
- **AI agents** for content engagement workflows (e.g. YouTube comment reply bot that uses video transcripts to generate contextual answers with timestamps)

---

## Current State (Phase: Instagram Posting — Complete)

The first feature is fully built: **Instagram posting** via the Meta Graph API.

Supported post types: Image, Story Image, Story Video, Reel, Carousel.

All other platform folders (`facebook/`, `linkedin/`, `youtube/`) exist as stubs, ready to be implemented.

---

## Credential Philosophy (YouTube Teaching Mode)

Because this is a YouTube tutorial project:

- **User-facing credentials** (platform access tokens, account IDs) are entered on the **Settings page** inside the app and stored in Supabase (`platform_credentials` table).
- **Infrastructure credentials** (Supabase URL, anon key, service role key) go in `**.env.local`** and are never committed.
- When the project is hosted publicly in the future, direct OAuth integrations with each platform will replace the manual token entry flow. Until then, users paste their own long-lived tokens.

---

## Tech Stack


| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router, TypeScript)                                 |
| Backend / DB | Supabase (Auth, Postgres, Storage)                                  |
| Styling      | Tailwind CSS + brand tokens from `src/lib/branding.ts`              |
| Icons        | Lucide React (outlined, 1.8px stroke)                               |
| Fonts        | Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (code) |
| Validation   | Zod                                                                 |


---

## Folder Structure

```
src/
  app/
    layout.tsx                        # RSC: root layout, fonts, metadata
    page.tsx                          # RSC: landing / redirect to dashboard
    globals.css                       # Tailwind + brand CSS custom properties
    (auth)/login, signup, callback
    (dashboard)/
      layout.tsx                      # RSC: sidebar + topbar shell
      dashboard/page.tsx              # RSC: parallel-fetch stats + recent posts
      create/page.tsx                 # RSC: fetch platforms, render client form
      history/page.tsx                # RSC: fetch posts, stream via Suspense
      settings/page.tsx               # RSC: fetch credentials, render client form
    api/v1/
      posts/route.ts                  # POST: create post
      posts/[postId]/route.ts         # GET: check status + auto-publish
      health/route.ts                 # GET: health check
  lib/
    branding.ts                       # Single source of truth for brand tokens
    supabase/client.ts, server.ts, admin.ts
    api-response.ts                   # Standardized { success, data/error } builder
    validators.ts                     # Zod schemas for API requests
  services/
    platforms/
      types.ts                        # PlatformService interface
      registry.ts                     # Platform name -> service factory
      instagram/                      # Complete
      facebook/, linkedin/, youtube/  # Stubs (implement interface + register)
    post.service.ts                   # Orchestrator: calls platform, saves to DB
    media.service.ts                  # Supabase Storage upload
  components/
    ui/                               # Primitives: button, input, card, badge, etc.
    layout/                           # sidebar, topbar
    create-post/                      # post-form, media-input, carousel-builder, etc.
    post-history/                     # history-table, status-poller
    settings/                        # platform-credentials-form
    dashboard/                        # stats-cards, recent-posts, quick-actions
  hooks/
    use-post-status.ts                # Client: polls status with exponential backoff
    use-media-upload.ts               # Client: upload with progress tracking
  types/
    database.ts, api.ts, media.ts
supabase/
  migrations/                         # SQL migrations (run in order)
```

---

## RSC Strategy (Important — Follow This)

- **All pages and layout shells are Server Components by default.** They fetch data directly from Supabase on the server.
- **Client Components** (`"use client"`) are only used when browser APIs, event handlers, or state are needed.
- **No `useEffect` for initial data.** All initial page data is fetched server-side; `useEffect` is only for polling or real-time updates after mount.
- **Parallel fetching** via `Promise.all` on dashboard-level server components.
- **Streaming** with `<Suspense fallback={<Skeleton />}>` for slow data sections.
- **Type adapters**: `types/database.ts` holds raw DB row types. UI components receive transformed frontend types — never raw DB shapes.

---

## Platform Abstraction (Extend This Pattern for New Platforms)

```typescript
interface PlatformService {
  createContainer(params: CreateContainerParams): Promise<CreateContainerResult>
  checkStatus(containerId: string): Promise<ContainerStatus>
  publish(containerId: string): Promise<PublishResult>
}
```

To add a new platform (e.g. YouTube, Facebook):

1. Create `src/services/platforms/<platform>/<platform>.service.ts` implementing `PlatformService`
2. Add types and constants in the same folder
3. Register the factory in `src/services/platforms/registry.ts`
4. Add the platform's credential fields to the Settings page form

---

## Database Schema Summary

`**profiles**` — extends `auth.users`. Fields: `display_name`, `avatar_url`.

`**platform_credentials**` — per-user, per-platform token storage. Fields: `user_id`, `platform`, `credentials` (JSONB), `is_active`. UNIQUE on `(user_id, platform)`. RLS: users can CRUD own rows only.

`**posts**` — post history + status tracking. Fields: `user_id`, `platform`, `post_type`, `caption`, `media_urls[]`, `container_id`, `published_media_id`, `status` (`pending|processing|finished|published|error`), `error_message`, `platform_response` (JSONB). RLS: users can read/create/update own rows only.

**Storage bucket `post-media`** — public read, user-scoped write. Path: `{user_id}/{timestamp}_{filename}`.

---

## API Design (Versioned — `v1`)

All API routes live under `/api/v1/`. They return a standardised envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```


| Route                   | Method | Purpose                                                 |
| ----------------------- | ------ | ------------------------------------------------------- |
| `/api/v1/posts`         | POST   | Create a post (returns post_id + status_check_url)      |
| `/api/v1/posts/:postId` | GET    | Check status; auto-publishes when container is FINISHED |
| `/api/v1/health`        | GET    | Health check                                            |


---

## Next Phases (Planned — In Priority Order)

### Phase: YouTube Comment Automation (Next)

- Fetch comments from a YouTube video via YouTube Data API v3
- AI agent filters comments that deserve a reply (ignore spam/generic)
- Fetch video transcript (YouTube captions or Whisper)
- LLM generates a reply that:
  - Directly answers the commenter's question
  - References the relevant video timestamp when applicable
- Post reply via YouTube Data API v3
- User credentials: YouTube OAuth token (entered on Settings page for now)

### Phase: Instagram Comment Automation

- Fetch comments on Instagram posts via Meta Graph API
- AI filters and generates replies, auto-posts via Graph API

### Phase: Instagram DM Automation

- Webhook-triggered DM replies via Meta Messenger API

### Phase: Story Reply Automation

- Detect story replies and respond via Meta Graph API

### Phase: Facebook Posting

- Implement `FacebookService` (same `PlatformService` interface)
- Register in registry

### Phase: LinkedIn Posting

- Implement `LinkedInService` (same `PlatformService` interface)
- Publish posts to LinkedIn profiles and company pages via LinkedIn API v2
- Register in registry

### Phase: Future Hosting / OAuth

- Replace manual token entry with proper OAuth flows per platform
- Consider monetisation / SaaS tier at this stage

---

## Coding Conventions (Observed in Codebase)

- **TypeScript strict** — all functions and classes have explicit type annotations and return types.
- **Descriptive docstrings** on all functions and classes (PEP 257 style for Python; JSDoc for TypeScript).
- **Services folder** is pure business logic — no Next.js-specific imports.
- `**lib/` folder** is shared utilities — supabase clients, validators, api-response builder, branding.
- **Component folders** mirror page folders (e.g. `components/dashboard/` for `(dashboard)/dashboard/page.tsx`).
- **kebab-case** for file names, **PascalCase** for components, **camelCase** for functions and variables.
- **Lucide React** for all icons — use outlined variants, 1.8px stroke.
- **Brand tokens** from `src/lib/branding.ts` — never hardcode colors or fonts.
- **Zod** for all API input validation.
- **Robust error handling** with context capture — all API routes and service methods catch and log errors with sufficient context.
- **No inline SQL** — use Supabase client query builder.
- **RLS enforced on all tables** — never rely solely on application-level auth checks.

