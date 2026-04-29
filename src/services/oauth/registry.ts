import type { OAuthProvider } from "./types";
import { YouTubeOAuthProvider } from "./providers/youtube.provider";
import { InstagramOAuthProvider } from "./providers/instagram.provider";
import { FacebookOAuthProvider } from "./providers/facebook.provider";
import { LinkedInOAuthProvider } from "./providers/linkedin.provider";

/**
 * Factory function type for creating an OAuthProvider instance.
 * Using a factory (rather than singleton instances) ensures each request gets a
 * fresh provider object with no shared mutable state.
 */
type OAuthProviderFactory = () => OAuthProvider;

/**
 * Maps lowercase platform slugs to their OAuthProvider factory functions.
 *
 * To register a new platform:
 * 1. Implement OAuthProvider in `src/services/oauth/providers/<platform>.provider.ts`
 * 2. Import and add an entry here
 * 3. Uncomment the relevant platform section once the provider is fully implemented
 */
const providerFactories: Record<string, OAuthProviderFactory> = {
  youtube: () => new YouTubeOAuthProvider(),
  instagram: () => new InstagramOAuthProvider(),
  facebook: () => new FacebookOAuthProvider(),
  linkedin: () => new LinkedInOAuthProvider(),
};

/**
 * Returns an OAuthProvider instance for the given platform slug.
 *
 * @param platform - Lowercase platform slug (e.g. "youtube", "instagram").
 * @returns A fresh OAuthProvider instance.
 * @throws If the platform is not registered in the factory map.
 */
export function getOAuthProvider(platform: string): OAuthProvider {
  const factory = providerFactories[platform];
  if (!factory) {
    throw new Error(
      `No OAuth provider registered for platform "${platform}". ` +
        `Supported platforms: ${Object.keys(providerFactories).join(", ")}`
    );
  }
  return factory();
}

/**
 * Returns true if the given platform slug has a registered OAuth provider.
 *
 * @param platform - Lowercase platform slug to check.
 */
export function isSupportedOAuthPlatform(platform: string): boolean {
  return platform in providerFactories;
}

/**
 * Returns an array of all platform slugs that have registered OAuth providers.
 */
export function getSupportedOAuthPlatforms(): string[] {
  return Object.keys(providerFactories);
}
