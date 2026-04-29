# SocialSyncs

**SocialSyncs** is an open-source, self-hosted social media automation platform built with Next.js 15. Post content, automate comments, and run AI-powered engagement workflows across Instagram, YouTube, and more — all from a single dashboard with your own API credentials.

> Built live on YouTube as a teaching project. Fork it, run your own instance, follow along episode by episode.

---

## What Can It Do Right Now?

| Feature | Platform | Status |
|---|---|---|
| Post images, reels, carousels & stories | Instagram | Live |
| YouTube comment automation (AI agent) | YouTube | In progress |
| Post to Facebook | Facebook | Coming soon |
| Post to YouTube | YouTube | Coming soon |
| Post to LinkedIn | LinkedIn | Coming soon |
| AI comment automation | Instagram | Planned |
| DM automation | Instagram | Planned |
| Story reply automation | Instagram | Planned |

---

## How It Works

SocialSyncs connects to social platforms using your own API credentials. You paste your access tokens into the Settings page — they are stored encrypted in your own Supabase database and never leave your infrastructure.

**Instagram posting flow (live):**
1. You create a post in the dashboard (image, reel, carousel, or story)
2. The app uploads your media to Supabase Storage
3. It calls the Meta Graph API to create a media container
4. A status poller waits until the container is ready
5. The app auto-publishes the post and saves the result

**YouTube comment automation flow (in progress):**
1. Fetches comments from your YouTube videos via YouTube Data API v3
2. An AI agent filters comments — ignoring spam, replying only to genuine questions
3. Pulls the video transcript with timestamps
4. An LLM (via OpenRouter) generates a reply that answers the question and references the exact timestamp
5. Posts the reply back to YouTube automatically, with a configurable signature suffix

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database / Auth | Supabase (Postgres, Auth, Storage) |
| Styling | Tailwind CSS + brand tokens (`src/lib/branding.ts`) |
| Icons | Lucide React |
| Validation | Zod |
| AI / LLM | OpenRouter (any model — defaults to Claude Sonnet) |
| Fonts | Plus Jakarta Sans, DM Sans, JetBrains Mono |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenRouter](https://openrouter.ai) API key (for AI comment automation)
- Platform credentials (Instagram, YouTube, etc.) — obtained from each platform's developer console

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/socialsyncs.git
cd socialsyncs
npm install
```

### 2. Create your environment file

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
# Required — from Supabase Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required — your app's base URL (used to build OAuth callback URIs)
APP_BASE_URL=http://localhost:3000

# Required for YouTube comment automation
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_CLAUDE_MODEL=anthropic/claude-sonnet-4-6   # or any OpenRouter model

# Required for YouTube OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional — AES-256-GCM key for encrypting stored OAuth tokens.
# Auto-derived from SUPABASE_SERVICE_ROLE_KEY if not set.
# For production, generate with: openssl rand -hex 32
# CREDENTIAL_ENCRYPTION_KEY=your_64_char_hex_key
```

### 3. Run database migrations

Open your Supabase project → SQL Editor and run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_user_media_gallery.sql
supabase/migrations/003_user_media_file_name.sql
supabase/migrations/004_youtube_automation_core.sql
supabase/migrations/005_platform_oauth_connections.sql
supabase/migrations/006_api_keys_and_run_tracking.sql
supabase/migrations/007_youtube_signature_suffix.sql
```

### 4. Create the storage bucket

In Supabase → Storage, create a bucket named **`post-media`** and set it to **Public**.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account, then go to **Settings** to connect your platforms.

---

## Connecting Platforms

### Instagram

SocialSyncs uses the **Meta Graph API**. You need a Facebook Developer account and a Facebook App with Instagram permissions.

1. Go to **Settings → Instagram**
2. Enter your **Instagram Business or Creator Account ID**
3. Enter a **long-lived Facebook Access Token** with these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

Your credentials are stored in your own Supabase instance — never shared.

> Full walkthrough is covered in the YouTube series.

### YouTube

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **YouTube Data API v3**
3. Create an **OAuth 2.0 Client ID** (Web application)
4. Add `http://localhost:3000/api/v1/auth/youtube/callback` as an authorized redirect URI
5. Add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`
6. Go to **Settings → YouTube** in the app and click **Connect with Google**

---

## API

SocialSyncs exposes a versioned REST API. All responses use this envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

You can authenticate API requests using a personal API key generated from **Settings → API Keys**.

### Create a Post

```http
POST /api/v1/posts
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "platform": "instagram",
  "post_type": "image",
  "caption": "Hello world!",
  "media_urls": ["https://your-public-image-url.com/photo.jpg"]
}
```

**Supported `post_type` values for Instagram:** `image`, `reel`, `carousel`, `story_image`, `story_video`

### Check Post Status

```http
GET /api/v1/posts/:postId
Authorization: Bearer YOUR_API_KEY
```

Returns current status. When the container is ready, this endpoint auto-publishes the post and returns `"status": "published"`.

### Health Check

```http
GET /api/v1/health
```

### API Documentation

Interactive API docs (OpenAPI) are available at:

```
GET /api/docs
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — display name, avatar |
| `platform_credentials` | Per-user, per-platform token storage (JSONB, RLS-protected) |
| `platform_oauth_connections` | OAuth connections — stores encrypted tokens, expiry, account info |
| `posts` | Post history and status tracking |
| `user_api_keys` | Hashed API keys for programmatic access |
| `youtube_automation_runs` | Logs of YouTube comment automation jobs |

All tables enforce Row Level Security (RLS) — users can only access their own data.

---

## Project Structure

```
src/
  app/
    (auth)/               # Login and signup pages
    (dashboard)/          # Main app — layout, dashboard, create, history, settings, youtube/
    api/v1/               # REST API routes (posts, auth, api-keys, youtube, docs, health)
  components/
    ui/                   # Primitive components (button, input, badge, card, skeleton, etc.)
    layout/               # Sidebar, topbar
    create-post/          # Post form, media input, carousel builder, file upload
    post-history/         # History table, status poller
    settings/             # Platform credentials form, OAuth connect card, API keys form
    dashboard/            # Stats cards, recent posts, quick actions
    youtube/              # Video grid, video card, automation config panel
  services/
    platforms/
      instagram/          # Complete — Meta Graph API integration
      facebook/           # Stub — implements PlatformService interface
      youtube/            # Stub — implements PlatformService interface
      linkedin/           # Stub — implements PlatformService interface
      registry.ts         # Maps platform names to service factories
    youtube/              # YouTube comment automation logic
    oauth/                # OAuth provider implementations (YouTube, Instagram, Facebook, LinkedIn)
    post.service.ts       # Orchestrator — calls platform service, saves to DB
    media.service.ts      # Supabase Storage upload
  lib/
    supabase/             # Server, client, and admin Supabase clients
    branding.ts           # Single source of truth for brand tokens (colors, fonts)
    validators.ts         # Zod schemas for API inputs
    api-response.ts       # Standardized { success, data/error } builder
    api-auth.ts           # API key authentication middleware
    oauth-encryption.ts   # AES-256-GCM encryption for OAuth tokens
    openrouter.ts         # OpenRouter LLM client
    openapi.ts            # OpenAPI specification
  hooks/
    use-post-status.ts    # Polls post status with exponential backoff
    use-media-upload.ts   # Tracks upload progress
  types/
    database.ts           # Raw Supabase row types
    api.ts                # API request/response types
    media.ts              # Media-related types
supabase/
  migrations/             # SQL migrations — run in numbered order
```

---

## Extending the Platform

To add a new platform (e.g. TikTok):

1. Create `src/services/platforms/tiktok/tiktok.service.ts` implementing:

```typescript
interface PlatformService {
  createContainer(params: CreateContainerParams): Promise<CreateContainerResult>
  checkStatus(containerId: string): Promise<ContainerStatus>
  publish(containerId: string): Promise<PublishResult>
}
```

2. Add types and constants in the same folder
3. Register the factory in `src/services/platforms/registry.ts`
4. Add credential fields to the Settings page

To add a new OAuth provider:

1. Create `src/services/oauth/<platform>.provider.ts` implementing `OAuthProvider`
2. Register it in `src/services/oauth/` index
3. Add a callback route at `src/app/api/v1/auth/<platform>/callback/route.ts`

---

## Contributing

This project is open source and built in public. Contributions are welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "add: your feature"`
4. Push and open a Pull Request

---

## YouTube Series

This project is built episode by episode on YouTube. Each episode covers a new feature from scratch — ideal if you want to understand every decision and how everything connects.

> Subscribe and follow along to build your own fully functional social media automation platform.

---

## License

MIT — free to use, modify, and distribute.
