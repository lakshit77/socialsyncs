import { ApiReference } from "@scalar/nextjs-api-reference";
import { openApiSpec } from "@/lib/openapi";

/**
 * GET /api/docs
 * Renders the interactive Scalar API reference UI.
 */
export const GET = ApiReference({
  content: openApiSpec,
  pageTitle: "SocialSyncs API Reference",
});
