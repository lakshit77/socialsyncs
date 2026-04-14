import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { syncUserMediaFromStorage } from "@/lib/user-media-sync";
import type { UserMediaRow } from "@/types/database";
import { GalleryBrowser } from "@/components/gallery/gallery-browser";

export default async function GalleryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await syncUserMediaFromStorage(user.id);

  const { data } = await supabase
    .from("user_media")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (data ?? []) as UserMediaRow[];

  return (
    <GalleryBrowser initialItems={items} />
  );
}
