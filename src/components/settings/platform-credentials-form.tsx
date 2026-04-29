"use client";

import { Camera, PlayCircle, Globe, Briefcase, Hash, Key } from "lucide-react";
import { OAuthConnectCard, type OAuthPlatformDefinition } from "./oauth-connect-card";
import { ManualCredentialsCard, type ManualPlatformDefinition } from "./manual-credentials-card";
import type { OAuthConnection } from "@/services/oauth/types";

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

/**
 * Platforms that use the full OAuth redirect flow and are currently active.
 */
const ACTIVE_OAUTH_PLATFORMS: OAuthPlatformDefinition[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: PlayCircle,
    description: "Automate comment replies using transcript-aware AI",
    devConsoleUrl: "https://console.cloud.google.com/apis/credentials",
    setupGuide: [
      {
        title: "Create Google Cloud project",
        detail: "Go to console.cloud.google.com, create a project, and enable YouTube Data API v3.",
      },
      {
        title: "Create OAuth 2.0 credentials",
        detail:
          "Under APIs & Services → Credentials, create an OAuth 2.0 Client ID (Web application type).",
      },
      {
        title: "Add redirect URI",
        detail:
          "Copy the Authorized Redirect URI shown in the form below and add it to your OAuth client's Authorized redirect URIs.",
      },
      {
        title: "Copy credentials",
        detail: "Paste your Client ID and Client Secret into the fields above and save.",
      },
    ],
  },
];

/**
 * Platforms with OAuth providers registered but not yet fully implemented.
 * Rendered as disabled "Coming Soon" cards.
 */
const COMING_SOON_PLATFORMS: OAuthPlatformDefinition[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: Globe,
    description: "Post to pages and automate engagement",
    devConsoleUrl: "https://developers.facebook.com/apps",
    comingSoon: true,
    setupGuide: [],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Briefcase,
    description: "Post to profiles and company pages",
    devConsoleUrl: "https://www.linkedin.com/developers/apps",
    comingSoon: true,
    setupGuide: [],
  },
];

/**
 * Platforms that use manual long-lived token entry.
 * Instagram stays here until a full OAuth migration is completed.
 */
const MANUAL_PLATFORMS: ManualPlatformDefinition[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    description: "Post images, stories, reels, and carousels",
    fields: [
      {
        key: "account_id",
        label: "Instagram Account ID",
        placeholder: "e.g. 17841456545908024",
        type: "text",
        icon: Hash,
        helpText: "Your numeric Instagram Business/Creator Account ID",
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Your long-lived Facebook access token",
        type: "password",
        icon: Key,
        helpText:
          "Requires: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement",
      },
    ],
    setupGuide: [
      {
        title: "Create Meta app",
        detail:
          "Go to developers.facebook.com, create a Business app, and add Instagram Graph API.",
      },
      {
        title: "Grant permissions",
        detail:
          "Use Graph API Explorer to generate a user token with instagram_basic, instagram_content_publish, pages_show_list, and pages_read_engagement scopes.",
      },
      {
        title: "Get long-lived token",
        detail: "Exchange the short-lived token using Facebook OAuth token exchange endpoint.",
      },
      {
        title: "Fetch Account ID",
        detail:
          "Call /me/accounts and then /{page-id}?fields=instagram_business_account to get the numeric account ID.",
      },
      {
        title: "Save credentials",
        detail: "Paste the Account ID and long-lived access token in this form, then save.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PlatformCredential {
  platform: string;
  credentials: Record<string, string>;
  is_active: boolean;
}

export interface PlatformOAuthConnectionSummary {
  platform: string;
  accountTitle: string;
  status: "active" | "expired" | "disconnected";
  tokenExpiry: string | null;
  oauthProvider: "system" | "custom";
  clientIdUsed: string;
}

interface PlatformCredentialsFormProps {
  /** Masked credential rows for manual platforms. */
  initialCredentials: PlatformCredential[];
  /** OAuth connection summaries fetched server-side. */
  oauthConnections: PlatformOAuthConnectionSummary[];
  /** Custom OAuth app credentials. Secret is never sent to client — only a presence flag. */
  customOAuthApps: Record<string, { client_id?: string; has_client_secret: boolean }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the connected platforms grid on the Settings page.
 *
 * OAuth-based platforms (YouTube, Facebook, LinkedIn) render OAuthConnectCard.
 * Manual-token platforms (Instagram) render ManualCredentialsCard.
 *
 * Adding a new platform:
 * - OAuth: add an entry to OAUTH_PLATFORMS above.
 * - Manual: add an entry to MANUAL_PLATFORMS above.
 */
export function PlatformCredentialsForm({
  initialCredentials,
  oauthConnections,
  customOAuthApps,
}: PlatformCredentialsFormProps) {
  /** Converts a connection summary row into the OAuthConnection shape for the card. */
  function toOAuthConnection(
    connectionRow: PlatformOAuthConnectionSummary | undefined
  ): OAuthConnection | null {
    if (!connectionRow) return null;
    return {
      id: "",
      userId: "",
      platform: connectionRow.platform,
      accountId: "",
      accountTitle: connectionRow.accountTitle,
      tokenExpiry: connectionRow.tokenExpiry ? new Date(connectionRow.tokenExpiry) : null,
      oauthProvider: connectionRow.oauthProvider,
      clientIdUsed: connectionRow.clientIdUsed,
      status: connectionRow.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Active OAuth platforms (YouTube first) */}
      {ACTIVE_OAUTH_PLATFORMS.map((platform) => (
        <OAuthConnectCard
          key={platform.id}
          platform={platform}
          connection={toOAuthConnection(oauthConnections.find((c) => c.platform === platform.id))}
          customCredentials={customOAuthApps[`${platform.id}_oauth_app`] ?? { has_client_secret: false }}
        />
      ))}

      {/* Manual-token platforms (Instagram) */}
      {MANUAL_PLATFORMS.map((platform) => {
        const existing = initialCredentials.find((c) => c.platform === platform.id);
        return (
          <ManualCredentialsCard
            key={platform.id}
            platform={platform}
            initialCredentials={existing?.credentials ?? {}}
            isConnected={existing?.is_active === true}
          />
        );
      })}

      {/* Coming-soon platforms — disabled placeholder cards */}
      {COMING_SOON_PLATFORMS.map((platform) => (
        <OAuthConnectCard
          key={platform.id}
          platform={platform}
          connection={null}
          customCredentials={{}}
        />
      ))}
    </div>
  );
}
