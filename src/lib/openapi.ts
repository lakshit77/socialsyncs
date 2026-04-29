/**
 * Single source of truth for the SocialSyncs public API spec.
 * Consumed by the Scalar docs route at /api/docs.
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SocialSyncs API",
    version: "1.0.0",
    description:
      "Automate YouTube comment replies and social media workflows. " +
      "Use an API key (created in Settings → API Keys) to call any endpoint from n8n or other automation tools.\n\n" +
      "## Authentication\n\n" +
      "All endpoints accept either:\n" +
      "- **API key** (recommended for n8n): `Authorization: Bearer ss_<your_key>`\n" +
      "- **Session cookie**: set automatically when using the app in a browser\n\n" +
      "## n8n Quick-start\n\n" +
      "1. Go to **Settings → API Keys** and create a key.\n" +
      "2. In n8n, add an **HTTP Request** node with:\n" +
      "   - Method: `POST`\n" +
      "   - URL: `https://your-domain/api/v1/youtube/automate/latest`\n" +
      "   - Header: `Authorization: Bearer ss_<your_key>`\n" +
      "   - Body (JSON): `{ \"maxVideos\": 5, \"runLimit\": 1, \"autoPostOverride\": true }`\n" +
      "3. Wire a Cron trigger to run it on your desired schedule.",
  },
  servers: [{ url: "/api/v1", description: "Current version" }],
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        description: "API key created in Settings → API Keys. Format: `ss_<32 hex chars>`.",
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "UNAUTHORIZED" },
              message: { type: "string", example: "Authentication required" },
              details: {},
            },
          },
        },
      },
    },
  },
  security: [{ apiKey: [] }],
  paths: {
    "/api-keys": {
      get: {
        tags: ["API Keys"],
        summary: "List API keys",
        description: "Returns all active (non-revoked) API keys for the authenticated user. Keys are masked — only the prefix is shown.",
        responses: {
          "200": {
            description: "List of API keys",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "n8n production" },
                          prefix: { type: "string", example: "ss_1a2b3c" },
                          created_at: { type: "string", format: "date-time" },
                          last_used_at: { type: "string", format: "date-time", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
        },
      },
      post: {
        tags: ["API Keys"],
        summary: "Create API key",
        description:
          "Creates a new API key. **The plaintext key is returned once and never stored — copy it immediately.**",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string", maxLength: 64, example: "n8n production" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Key created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        prefix: { type: "string" },
                        key: { type: "string", example: "ss_1a2b3c4d5e6f...", description: "Plaintext key — shown once only" },
                        created_at: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api-keys/{keyId}": {
      delete: {
        tags: ["API Keys"],
        summary: "Revoke API key",
        parameters: [{ name: "keyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Key revoked", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "object", properties: { revoked: { type: "boolean" } } } } } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/youtube/videos": {
      get: {
        tags: ["YouTube"],
        summary: "List YouTube videos",
        description: "Returns a page of the authenticated user's public YouTube videos (cursor-based pagination).",
        parameters: [
          { name: "maxResults", in: "query", schema: { type: "integer", default: 15, maximum: 50 }, description: "Videos per page." },
          {
            name: "pageToken",
            in: "query",
            schema: { type: "string" },
            description: "Cursor for the next page. Take the `nextPageToken` value from the previous response and pass it here. Omit on the first request.",
          },
          {
            name: "filter",
            in: "query",
            schema: { type: "string", enum: ["all", "long", "short"], default: "all" },
            description: '"long" = regular videos only (duration > 60s), "short" = YouTube Shorts only (≤ 60s), "all" = no filter.',
          },
        ],
        responses: {
          "200": {
            description: "Video page with pagination metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        videos: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              title: { type: "string" },
                              thumbnail_url: { type: "string", nullable: true },
                              published_at: { type: "string", format: "date-time", nullable: true },
                              view_count: { type: "integer" },
                              comment_count: { type: "integer" },
                              duration_seconds: { type: "integer" },
                              is_short: { type: "boolean", description: "True when duration ≤ 60s (YouTube Short)." },
                            },
                          },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            currentPage: { type: "integer", example: 1 },
                            hasNextPage: { type: "boolean" },
                            hasPrevPage: { type: "boolean" },
                            nextPageToken: { type: "string", nullable: true, description: "Pass as ?pageToken= to get the next page." },
                            prevPageToken: { type: "string", nullable: true, description: "Pass as ?pageToken= to get the previous page." },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "YouTube not connected or invalid filter" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/youtube/videos/sync": {
      post: {
        tags: ["YouTube"],
        summary: "Sync latest videos + transcripts",
        description:
          "Fetches the latest N videos from the YouTube channel, upserts them into the database, " +
          "and optionally fetches transcripts for any rows missing them.\n\n" +
          "**n8n example body:** `{ \"maxVideos\": 5, \"fetchTranscript\": true }`",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  maxVideos: { type: "integer", default: 5, maximum: 50, description: "Number of latest videos to sync." },
                  fetchTranscript: { type: "boolean", default: true, description: "Fetch captions for videos without a stored transcript." },
                  skipIfNoCaptions: { type: "boolean", default: false, description: "When true, videos without captions are silently skipped rather than listed in skippedNoTranscript." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        totalVideos: { type: "integer" },
                        inserted: { type: "array", items: { type: "string" }, description: "Video IDs newly inserted." },
                        updated: { type: "array", items: { type: "string" }, description: "Video IDs that already existed and were updated." },
                        transcriptsFetched: { type: "array", items: { type: "string" } },
                        skippedNoTranscript: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "YouTube not connected" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/youtube/automate": {
      post: {
        tags: ["YouTube"],
        summary: "Run automation for a specific video",
        description:
          "Runs comment analysis and reply generation for the given video ID. " +
          "The video must already be in the database (use `/youtube/videos/sync` first). " +
          "Reply signatures are appended deterministically from the per-video automation config (`signature_suffix`).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["videoId"],
                properties: { videoId: { type: "string", example: "dQw4w9WgXcQ" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Automation summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        runId: { type: "string", format: "uuid" },
                        processed: { type: "integer" },
                        queued: { type: "integer" },
                        posted: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized or token expired" },
          "500": { description: "Automation error" },
        },
      },
    },
    "/youtube/automate/latest": {
      post: {
        tags: ["YouTube"],
        summary: "Run automation on newest unprocessed video(s)",
        description:
          "The primary n8n endpoint. Selects the newest video(s) without a completed run, " +
          "syncs metadata, runs automation, and returns per-video results. " +
          "Reply signatures are appended deterministically from each video's automation config (`signature_suffix`).\n\n" +
          "**n8n example:**\n" +
          "```json\n" +
          "POST /api/v1/youtube/automate/latest\n" +
          "Authorization: Bearer ss_<your_key>\n" +
          "{\n" +
          '  "maxVideos": 5,\n' +
          '  "runLimit": 1,\n' +
          '  "autoPostOverride": true\n' +
          "}\n" +
          "```",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  maxVideos: { type: "integer", default: 5, maximum: 50, description: "Latest N videos to consider as candidates." },
                  runLimit: { type: "integer", default: 1, maximum: 10, description: "Max number of videos to run automation on in this call." },
                  requireTranscript: { type: "boolean", default: false, description: "Skip videos that have no transcript stored." },
                  autoPostOverride: { type: "boolean", nullable: true, description: "Override the per-video auto_post setting. true = always post, false = always queue." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Run results per video",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        runs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              videoId: { type: "string" },
                              title: { type: "string" },
                              status: { type: "string", enum: ["completed", "failed"] },
                              runId: { type: "string", format: "uuid" },
                              processed: { type: "integer" },
                              queued: { type: "integer" },
                              posted: { type: "integer" },
                              error: { type: "string", nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "YouTube not connected" },
          "401": { description: "Unauthorized or token expired" },
        },
      },
    },
  },
};
