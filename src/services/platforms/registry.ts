import type { PlatformService, PlatformCredentials } from "./types";
import { InstagramService } from "./instagram/instagram.service";

type PlatformFactory = (credentials: PlatformCredentials) => PlatformService;

const platformFactories: Record<string, PlatformFactory> = {
  instagram: (creds) =>
    new InstagramService(creds.account_id, creds.access_token),
  // facebook: (creds) => new FacebookService(creds),
  // linkedin: (creds) => new LinkedInService(creds),
};

export function getPlatformService(
  platform: string,
  credentials: PlatformCredentials
): PlatformService {
  const factory = platformFactories[platform];
  if (!factory) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return factory(credentials);
}

export function getSupportedPlatforms(): string[] {
  return Object.keys(platformFactories);
}
