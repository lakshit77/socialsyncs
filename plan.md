# SocialSyncs - Social Media Posting SaaS

## Context
Building a Next.js SaaS application that replicates the Instagram posting workflow from the n8n template (`ig_posting.json`) as a standalone web app with a public-grade API. The app will support multi-platform social media posting (Instagram now, Facebook/LinkedIn/YouTube later). The API is designed to be independently consumable as a service in the future.

---

## Keys Required From User

**Environment variables (`.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

**Per-user (entered on Settings page):**
- **Instagram Account ID** - numeric IG Business/Creator account ID
- **Facebook Access Token** - long-lived token with `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` permissions

---

## Tech Stack
- Next.js 15 (App Router, TypeScript)
- Supabase (Auth, Database, Storage)
- Tailwind CSS + brand CSS variables from `lib/branding.ts`
- Lucide React icons (outlined, 1.8px stroke)
- Fonts: Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (code)

---

## RSC (React Server Components) Strategy

### Server Components (default — no "use client")
All pages and layout shells are Server Components. They fetch data directly from Supabase on the server with zero client-side waterfalls:

- **`(dashboard)/layout.tsx`** — sidebar + topbar, rendered on server
- **`dashboard/page.tsx`** — parallel fetches stats + recent posts via `Promise.all`, streams with `<Suspense fallback={<Skeleton />}>`
- **`history/page.tsx`** — server-fetches initial posts page, wraps `<HistoryTable>` client component in `<Suspense>`
- **`settings/page.tsx`** — server-fetches current credentials (masked), passes to client form
- **`create/page.tsx`** — server-fetches available platforms from user's credentials, passes to client form
- **`components/dashboard/stats-cards.tsx`** — server component, fetches counts directly
- **`components/dashboard/recent-posts.tsx`** — server component, fetches last 5 posts

### Client Components (interactive, marked "use client")
Only components that need browser APIs, event handlers, or state:

- `components/create-post/post-form.tsx` — multi-step form with useState
- `components/create-post/carousel-builder.tsx` — drag/reorder, dynamic add/remove
- `components/create-post/media-input.tsx` — file upload with drag-and-drop
- `components/post-history/history-table.tsx` — sorting, filtering, pagination
- `components/post-history/status-poller.tsx` — useEffect polling
- `components/settings/platform-credentials-form.tsx` — form inputs + submit
- `components/ui/file-upload.tsx` — drag-and-drop with progress

### RSC Patterns Applied
1. **Parallel data fetching** — dashboard page uses `Promise.all([getStats(), getRecentPosts()])` in the server component
2. **Streaming with Suspense** — slow data sections wrapped in `<Suspense fallback={<Skeleton />}>` so fast parts render immediately
3. **Type adapters** — `types/database.ts` has DB row types, components receive transformed frontend types (no raw DB shapes in UI)
4. **No useEffect for initial data** — all initial page data is fetched server-side; useEffect only for polling/real-time updates after mount
5. **Server-to-client boundary** — server components fetch + transform data, pass serializable props to client components

---

## Folder Structure

```
src/
  app/
    layout.tsx                             # RSC: root layout, fonts, metadata
    page.tsx                               # RSC: landing / redirect to dashboard
    globals.css                            # Tailwind + brand CSS custom properties
    (auth)/login/page.tsx, signup/page.tsx, callback/route.ts
    (dashboard)/
      layout.tsx                           # RSC: sidebar + topbar shell
      dashboard/page.tsx                   # RSC: parallel fetch stats + recent posts
      create/page.tsx                      # RSC: fetch platforms, render client form
      history/page.tsx                     # RSC: fetch posts, stream via Suspense
      settings/page.tsx                    # RSC: fetch credentials, render client form
    api/v1/
      posts/route.ts                       # POST = create post (API 1)
      posts/[postId]/route.ts              # GET = check status + auto-publish (API 2)
      upload/route.ts                      # POST = upload media to Supabase Storage
      health/route.ts                      # GET = health check
  lib/
    branding.ts                            # Single source of truth for brand tokens
    supabase/client.ts, server.ts, admin.ts
    api-response.ts                        # Standardized { success, data/error } builder
    validators.ts                          # Zod schemas for API requests
  services/
    platforms/
      types.ts                             # PlatformService interface
      registry.ts                          # Platform name -> service factory
      instagram/
        instagram.service.ts               # All 5 post types + status + publish
        instagram.types.ts
        instagram.constants.ts
      facebook/, linkedin/                 # Stubs for future
    post.service.ts                        # Orchestrator: calls platform, saves to DB
    media.service.ts                       # Supabase Storage upload
  components/
    ui/button, input, textarea, select, badge, card, dialog, file-upload, status-badge, skeleton
    layout/sidebar, topbar, nav-item
    create-post/post-form, platform-selector, post-type-selector, media-input, carousel-builder, caption-input, reel-options, submit-button
    post-history/history-table, history-filters, status-poller
    settings/platform-credentials-form, credential-card
    dashboard/stats-cards, recent-posts, quick-actions
  hooks/
    use-post-status.ts                     # Client: polls status with exponential backoff
    use-media-upload.ts                    # Client: upload with progress tracking
  types/database.ts, api.ts, post.ts
```

---

## Database Schema (Supabase)

### Tables

**profiles** - extends auth.users
- `id` UUID PK -> auth.users(id)
- `display_name`, `avatar_url`, `created_at`, `updated_at`
- RLS: users can read/update own row

**platform_credentials** - tokens per platform (plaintext for now, encryption later)
- `id` UUID PK, `user_id` FK, `platform` TEXT, `credentials` JSONB, `is_active` BOOLEAN
- UNIQUE(user_id, platform)
- RLS: users can CRUD own rows

**posts** - post history + status tracking
- `id` UUID PK, `user_id` FK, `platform`, `post_type`
- `caption`, `media_urls` TEXT[], `cover_url`, `audio_name`
- `container_id`, `published_media_id`, `status` (pending|processing|finished|published|error), `error_message`
- `platform_response` JSONB, `created_at`, `updated_at`, `published_at`
- Indexes on: user_id, status, created_at DESC
- RLS: users can read/create/update own rows

### Storage
- Bucket `post-media` (public read, user-scoped write)
- Path: `{user_id}/{timestamp}_{filename}`
- Max 50MB, MIME: image/jpeg, image/png, image/webp, video/mp4, video/quicktime

---

## API Design (Versioned, Standalone-Ready)

### API 1: Create Post
`POST /api/v1/posts`
```
Request: { platform, post_type, caption?, media_urls[], cover_url?, audio_name? }
Response: { success: true, data: { post_id, container_id, status: "processing", status_check_url } }
```

### API 2: Check Status (+ auto-publish when ready)
`GET /api/v1/posts/:postId`
```
Response: { success: true, data: { post_id, platform, post_type, status, container_id, published_media_id, error_message, created_at, published_at } }
```
When status is "processing", the server polls IG Graph API. If container is FINISHED, it auto-publishes and returns status="published".

### Upload Media
`POST /api/v1/upload` (multipart/form-data)
```
Response: { success: true, data: { url, path } }
```

### Health
`GET /api/v1/health`

---

## Instagram Service Layer

Based on the n8n template, all IG Graph API calls use `https://graph.facebook.com/v22.0/`:

| Post Type | Container Endpoint | Parameters |
|-----------|-------------------|------------|
| Image | POST `/{id}/media` | image_url, caption |
| Story Image | POST `/{id}/media` | media_type=STORIES, image_url |
| Story Video | POST `/{id}/media` | media_type=STORIES, video_url |
| Reel | POST `/{id}/media` | media_type=REELS, video_url, caption, cover_url, audio_name |
| Carousel | POST `/{id}/media` per child (image_url), then POST `/{id}/media` with media_type=CAROUSEL, children=id1,id2,..., caption |

**Status**: GET `/{container_id}?fields=status_code` -> check for "FINISHED"
**Publish**: POST `/{id}/media_publish` with creation_id={container_id}

Key: Meta Graph API accepts params as query strings on POST (not JSON body). Auth via `Authorization: Bearer {token}` header.

---

## Platform Abstraction

```typescript
interface PlatformService {
  createContainer(params): Promise<{ containerId: string }>
  checkStatus(containerId): Promise<{ statusCode: string, isReady: boolean }>
  publish(containerId): Promise<{ mediaId: string }>
}
```
Registry maps platform name -> factory function. Adding Facebook/LinkedIn/YouTube = implement interface + register.

---

## Frontend Pages

1. **Dashboard** — RSC page, parallel-fetches stats + recent posts with `Promise.all`, streams via `<Suspense>` with skeleton fallbacks
2. **Create Post** — RSC shell fetches available platforms, renders `<PostForm>` client component: platform selector -> post type -> media input (upload OR URL) -> caption/options -> submit
3. **History** — RSC page fetches initial posts, streams table via `<Suspense>`, client `<HistoryTable>` adds sorting/filtering, `<StatusPoller>` polls processing posts with exponential backoff (3s->5s->8s->30s max)
4. **Settings** — RSC page fetches credentials (masked), renders `<PlatformCredentialsForm>` client component with test connection button

---

## Implementation Order

### Phase 1: Foundation
- Init Next.js, install deps, set up `lib/branding.ts`, `globals.css`, Tailwind config
- Set up Supabase clients (`lib/supabase/client.ts`, `server.ts`, `admin.ts`)
- Run migration, create storage bucket
- Auth pages (login/signup)

### Phase 2: Service Layer
- `lib/validators.ts`, `lib/api-response.ts`
- `services/platforms/types.ts`, `registry.ts`
- `services/platforms/instagram/instagram.service.ts` (all 5 post types)
- `services/media.service.ts`

### Phase 3: API Routes
- POST `/api/v1/posts`, GET `/api/v1/posts/:postId`, POST `/api/v1/upload`, GET `/api/v1/health`

### Phase 4: Settings Page
- UI components (button, input, card, badge, skeleton)
- Dashboard layout (sidebar, topbar) as RSC
- Settings page: RSC shell + client credential form

### Phase 5: Create Post Page
- All create-post client components (platform selector, post type, media input, carousel builder, caption, reel options)
- PostForm orchestrator, wire to API
- RSC shell passes available platforms as props

### Phase 6: History + Dashboard
- History: RSC page with Suspense streaming + client table/filters/poller
- Dashboard: RSC page with parallel fetches + Suspense + skeleton fallbacks

### Phase 7: Polish
- Animations (framer-motion), loading skeletons, error states, responsive design, empty states

---

## Verification Plan
1. Save IG credentials on Settings page -> verify stored in DB
2. Upload image via Create Post -> verify in Supabase Storage, public URL accessible
3. Create an Image post -> verify container created on IG Graph API, post_id returned
4. Poll status -> verify auto-publish when FINISHED, status updates in real-time
5. Check History -> verify post appears with correct status and timestamp
6. Test each post type: image, story image, story video, reel, 3-image carousel
7. Test API directly with curl (no frontend) to verify standalone API usability
