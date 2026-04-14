"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface TopbarProps {
  userEmail?: string;
}

export function Topbar({ userEmail }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-surface-elevated flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-text-muted">{userEmail}</span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </header>
  );
}
