import { createClient } from "@/lib/supabase/server";
import { PlatformCredentialsForm } from "@/components/settings/platform-credentials-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: credentials } = await supabase
    .from("platform_credentials")
    .select("platform, credentials, is_active");

  // Mask tokens for display
  const maskedCredentials = (credentials ?? []).map((c) => {
    const creds = c.credentials as { access_token: string; account_id: string };
    return {
      platform: c.platform as string,
      credentials: {
        access_token: creds.access_token
          ? `${creds.access_token.slice(0, 8)}${"*".repeat(20)}`
          : "",
        account_id: creds.account_id ?? "",
      },
      is_active: c.is_active as boolean,
    };
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          Settings
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Connect your social media accounts to start posting
        </p>
      </div>

      <PlatformCredentialsForm initialCredentials={maskedCredentials} />
    </div>
  );
}
