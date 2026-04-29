# Graph Report - .  (2026-04-29)

## Corpus Check
- Corpus is ~37,675 words - fits in a single context window. You may not need a graph.

## Summary
- 346 nodes · 408 edges · 72 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Project Docs & Architecture|Project Docs & Architecture]]
- [[_COMMUNITY_Carousel Builder UI|Carousel Builder UI]]
- [[_COMMUNITY_Comment Automation Service|Comment Automation Service]]
- [[_COMMUNITY_Instagram OAuth Provider|Instagram OAuth Provider]]
- [[_COMMUNITY_Instagram API Service|Instagram API Service]]
- [[_COMMUNITY_API Key Auth|API Key Auth]]
- [[_COMMUNITY_YouTube Service|YouTube Service]]
- [[_COMMUNITY_Media Constants & Utilities|Media Constants & Utilities]]
- [[_COMMUNITY_Pending Replies Tab|Pending Replies Tab]]
- [[_COMMUNITY_LinkedIn OAuth Provider|LinkedIn OAuth Provider]]
- [[_COMMUNITY_YouTube OAuth Provider|YouTube OAuth Provider]]
- [[_COMMUNITY_Facebook OAuth Provider|Facebook OAuth Provider]]
- [[_COMMUNITY_AI Reply Generation|AI Reply Generation]]
- [[_COMMUNITY_UI Card Primitives|UI Card Primitives]]
- [[_COMMUNITY_OAuth Connect Settings|OAuth Connect Settings]]
- [[_COMMUNITY_Gallery Display Helpers|Gallery Display Helpers]]
- [[_COMMUNITY_User API Keys Section|User API Keys Section]]
- [[_COMMUNITY_Supabase Middleware|Supabase Middleware]]
- [[_COMMUNITY_API Keys Form|API Keys Form]]
- [[_COMMUNITY_Post History Table|Post History Table]]
- [[_COMMUNITY_YouTube Video Card|YouTube Video Card]]
- [[_COMMUNITY_YouTube Automation Config|YouTube Automation Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Sign Up Page|Sign Up Page]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Status Badge|Status Badge]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Textarea Component|Textarea Component]]
- [[_COMMUNITY_Input Component|Input Component]]
- [[_COMMUNITY_Skeleton Component|Skeleton Component]]
- [[_COMMUNITY_Settings Shell|Settings Shell]]
- [[_COMMUNITY_Post Form|Post Form]]
- [[_COMMUNITY_Topbar|Topbar]]
- [[_COMMUNITY_Media Gallery Grid|Media Gallery Grid]]
- [[_COMMUNITY_Gallery Browser|Gallery Browser]]
- [[_COMMUNITY_YouTube Video Grid|YouTube Video Grid]]
- [[_COMMUNITY_Post Status Hook|Post Status Hook]]
- [[_COMMUNITY_Media Upload Hook|Media Upload Hook]]
- [[_COMMUNITY_Tailwind Utils|Tailwind Utils]]
- [[_COMMUNITY_OpenRouter LLM|OpenRouter LLM]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Env Types|Next.js Env Types]]
- [[_COMMUNITY_ESLint Config File|ESLint Config File]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_API Types|API Types]]
- [[_COMMUNITY_Database Types|Database Types]]
- [[_COMMUNITY_Media Types|Media Types]]
- [[_COMMUNITY_API Docs Route|API Docs Route]]
- [[_COMMUNITY_YouTube Video Detail Page|YouTube Video Detail Page]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_History Page|History Page]]
- [[_COMMUNITY_File Upload Component|File Upload Component]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Gallery Media Card|Gallery Media Card]]
- [[_COMMUNITY_Quick Actions|Quick Actions]]
- [[_COMMUNITY_Stats Cards|Stats Cards]]
- [[_COMMUNITY_Recent Posts|Recent Posts]]
- [[_COMMUNITY_Zod Validators|Zod Validators]]
- [[_COMMUNITY_OpenAPI Spec|OpenAPI Spec]]
- [[_COMMUNITY_Branding Tokens|Branding Tokens]]
- [[_COMMUNITY_Platform Service Types|Platform Service Types]]
- [[_COMMUNITY_YouTube Platform Types|YouTube Platform Types]]
- [[_COMMUNITY_YouTube Constants|YouTube Constants]]
- [[_COMMUNITY_Instagram Platform Types|Instagram Platform Types]]
- [[_COMMUNITY_Instagram Constants|Instagram Constants]]
- [[_COMMUNITY_OAuth Service Types|OAuth Service Types]]
- [[_COMMUNITY_File Icon SVG|File Icon SVG]]
- [[_COMMUNITY_Globe Icon SVG|Globe Icon SVG]]
- [[_COMMUNITY_Window Icon SVG|Window Icon SVG]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 31 edges
2. `POST()` - 22 edges
3. `createAdminClient()` - 22 edges
4. `SocialSyncs README` - 19 edges
5. `SocialSyncs Project Context` - 14 edges
6. `createClient()` - 13 edges
7. `YouTubeService` - 13 edges
8. `InstagramService` - 12 edges
9. `OAuthConnectionService` - 11 edges
10. `CommentAutomationService` - 8 edges

## Surprising Connections (you probably didn't know these)
- `@tailwindcss/postcss Plugin` --semantically_similar_to--> `Tailwind CSS`  [INFERRED] [semantically similar]
  postcss.config.mjs → README.md
- `Next.js Logo SVG (NEXT.JS wordmark)` --semantically_similar_to--> `Next.js 15 (App Router, TypeScript)`  [INFERRED] [semantically similar]
  public/next.svg → README.md
- `Vercel Logo SVG (triangle wordmark)` --semantically_similar_to--> `Next.js 15 (App Router, TypeScript)`  [INFERRED] [semantically similar]
  public/vercel.svg → README.md
- `Facebook Posting (Stub)` --semantically_similar_to--> `Phase: Facebook Posting`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `LinkedIn Posting (Stub)` --semantically_similar_to--> `Phase: LinkedIn Posting`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md

## Hyperedges (group relationships)
- **Platform Service Abstraction Pattern (interface + registry + implementations)** — claude_platform_abstraction, plan_platform_abstraction, readme_platform_service_interface, readme_platform_instagram, readme_platform_facebook, readme_platform_linkedin, readme_platform_youtube [INFERRED 0.90]
- **Instagram 3-Step Publish Workflow (container → status poll → publish)** — longform_instagram_api_flow, plan_instagram_service_layer, readme_api_create_post, readme_api_check_status [INFERRED 0.88]
- **RSC Data Fetching Pattern (server fetch, suspense, no useEffect for initial data)** — claude_rsc_strategy, plan_rsc_strategy, readme_nextjs [INFERRED 0.85]

## Communities

### Community 0 - "Project Docs & Architecture"
Cohesion: 0.05
Nodes (51): Next.js Breaking Changes Warning, Versioned API Design (/api/v1/), Coding Conventions (TypeScript strict, JSDoc, kebab-case), Credential Philosophy (YouTube Teaching Mode), Database Schema (profiles, platform_credentials, posts), Phase: Facebook Posting, Phase: Instagram Comment Automation, Phase: Instagram DM Automation (+43 more)

### Community 1 - "Carousel Builder UI"
Cohesion: 0.07
Nodes (15): addItem(), handleFileSelect(), handleUrlAdd(), DashboardLayout(), handleUrlSubmit(), CreatePostPage(), GalleryPage(), Home() (+7 more)

### Community 2 - "Comment Automation Service"
Cohesion: 0.16
Nodes (8): createAdminClient(), CommentAutomationService, OAuthConnectionService, OAuthTokenExpiredError, decrypt(), encrypt(), getEncryptionKey(), YouTubeVideosPage()

### Community 3 - "Instagram OAuth Provider"
Cohesion: 0.11
Nodes (12): InstagramOAuthProvider, decodeOAuthState(), encodeOAuthState(), getOAuthProvider(), isSupportedOAuthPlatform(), decodeCursor(), encodeCursor(), GET() (+4 more)

### Community 4 - "Instagram API Service"
Cohesion: 0.12
Nodes (6): InstagramApiError, InstagramService, checkAndPublishPost(), createPost(), PostServiceError, getPlatformService()

### Community 5 - "API Key Auth"
Cohesion: 0.14
Nodes (8): generateApiKey(), resolveUserId(), resolveUserIdFromApiKey(), sha256Hex(), apiError(), apiSuccess(), DELETE(), POST()

### Community 6 - "YouTube Service"
Cohesion: 0.15
Nodes (2): YouTubeApiError, YouTubeService

### Community 7 - "Media Constants & Utilities"
Cohesion: 0.33
Nodes (6): buildPostMediaObjectPath(), isPostMediaTypeAllowed(), resolveMediaContentType(), sanitizeStorageFilename(), MediaUploadError, uploadMedia()

### Community 8 - "Pending Replies Tab"
Cohesion: 0.29
Nodes (0): 

### Community 9 - "LinkedIn OAuth Provider"
Cohesion: 0.29
Nodes (1): LinkedInOAuthProvider

### Community 10 - "YouTube OAuth Provider"
Cohesion: 0.33
Nodes (1): YouTubeOAuthProvider

### Community 11 - "Facebook OAuth Provider"
Cohesion: 0.29
Nodes (1): FacebookOAuthProvider

### Community 12 - "AI Reply Generation"
Cohesion: 0.53
Nodes (4): appendDeterministicAgentSignature(), ensureTimestampIsClickableInReply(), escapeRegExp(), normalizeYouTubeTimestamp()

### Community 13 - "UI Card Primitives"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "OAuth Connect Settings"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Gallery Display Helpers"
Cohesion: 0.4
Nodes (0): 

### Community 16 - "User API Keys Section"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Supabase Middleware"
Cohesion: 0.5
Nodes (2): middleware(), updateSession()

### Community 18 - "API Keys Form"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Post History Table"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "YouTube Video Card"
Cohesion: 1.0
Nodes (2): formatDuration(), VideoCard()

### Community 21 - "YouTube Automation Config"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "ESLint Config"
Cohesion: 0.67
Nodes (3): ESLint Config, eslint-config-next/typescript, eslint-config-next/core-web-vitals

### Community 23 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Sign Up Page"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Status Badge"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Badge Component"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Textarea Component"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Input Component"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Skeleton Component"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Settings Shell"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Post Form"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Topbar"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Media Gallery Grid"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Gallery Browser"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "YouTube Video Grid"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Post Status Hook"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Media Upload Hook"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Tailwind Utils"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "OpenRouter LLM"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Next.js Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "ESLint Config File"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "API Types"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Database Types"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Media Types"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "API Docs Route"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "YouTube Video Detail Page"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "History Page"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "File Upload Component"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Button Component"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Sidebar Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Gallery Media Card"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Quick Actions"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Stats Cards"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Recent Posts"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Zod Validators"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "OpenAPI Spec"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Branding Tokens"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Platform Service Types"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "YouTube Platform Types"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "YouTube Constants"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Instagram Platform Types"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Instagram Constants"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "OAuth Service Types"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "File Icon SVG"
Cohesion: 1.0
Nodes (1): File Icon SVG (document/file representation)

### Community 70 - "Globe Icon SVG"
Cohesion: 1.0
Nodes (1): Globe Icon SVG (web/internet)

### Community 71 - "Window Icon SVG"
Cohesion: 1.0
Nodes (1): Window/Browser Icon SVG (desktop app/UI)

## Knowledge Gaps
- **22 isolated node(s):** `PostCSS Config`, `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, `YouTube Posting (Stub)`, `Instagram Comment Automation` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sign Up Page`** (2 nodes): `handleSignup()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (2 nodes): `handleLogin()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Status Badge`** (2 nodes): `status-badge.tsx`, `StatusBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badge Component`** (2 nodes): `Badge()`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Textarea Component`** (2 nodes): `textarea.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Component`** (2 nodes): `cn()`, `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Skeleton Component`** (2 nodes): `Skeleton()`, `skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Shell`** (2 nodes): `renderContent()`, `settings-shell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Post Form`** (2 nodes): `handleSubmit()`, `post-form.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Topbar`** (2 nodes): `topbar.tsx`, `handleSignOut()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Gallery Grid`** (2 nodes): `MediaGalleryGrid()`, `media-gallery-grid.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gallery Browser`** (2 nodes): `onSelectFile()`, `gallery-browser.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `YouTube Video Grid`** (2 nodes): `video-grid.tsx`, `handleLoadMore()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Post Status Hook`** (2 nodes): `use-post-status.ts`, `usePostStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Upload Hook`** (2 nodes): `use-media-upload.ts`, `useMediaUpload()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Utils`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OpenRouter LLM`** (2 nodes): `generateOpenRouterJsonResponse()`, `openrouter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Env Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config File`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Types`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database Types`** (1 nodes): `database.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Types`** (1 nodes): `media.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Docs Route`** (1 nodes): `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `YouTube Video Detail Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `History Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File Upload Component`** (1 nodes): `file-upload.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button Component`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Navigation`** (1 nodes): `sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gallery Media Card`** (1 nodes): `gallery-media-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Quick Actions`** (1 nodes): `quick-actions.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Cards`** (1 nodes): `stats-cards.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recent Posts`** (1 nodes): `recent-posts.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zod Validators`** (1 nodes): `validators.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OpenAPI Spec`** (1 nodes): `openapi.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Branding Tokens`** (1 nodes): `branding.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Platform Service Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `YouTube Platform Types`** (1 nodes): `youtube.types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `YouTube Constants`** (1 nodes): `youtube.constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Instagram Platform Types`** (1 nodes): `instagram.types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Instagram Constants`** (1 nodes): `instagram.constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OAuth Service Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File Icon SVG`** (1 nodes): `File Icon SVG (document/file representation)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe Icon SVG`** (1 nodes): `Globe Icon SVG (web/internet)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Window Icon SVG`** (1 nodes): `Window/Browser Icon SVG (desktop app/UI)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Instagram OAuth Provider` to `Carousel Builder UI`, `Comment Automation Service`, `Instagram API Service`, `API Key Auth`, `YouTube Service`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `POST()` connect `API Key Auth` to `Carousel Builder UI`, `Comment Automation Service`, `Instagram OAuth Provider`, `Instagram API Service`, `YouTube Service`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Comment Automation Service` to `Carousel Builder UI`, `Instagram OAuth Provider`, `Instagram API Service`, `API Key Auth`, `Media Constants & Utilities`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `GET()` (e.g. with `createClient()` and `apiError()`) actually correct?**
  _`GET()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `POST()` (e.g. with `createClient()` and `apiError()`) actually correct?**
  _`POST()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `createAdminClient()` (e.g. with `POST()` and `GET()`) actually correct?**
  _`createAdminClient()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PostCSS Config`, `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._