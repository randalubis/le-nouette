import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(
  folder: "products" | "qris" | "payment-proofs",
  file: File,
): Promise<{ url: string; path: string }> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 5MB)");
  }

  const supabase = createSupabaseServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(env.storageBucket())
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(env.storageBucket()).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteImage(path: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(env.storageBucket()).remove([path]);
}

export function pathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf("/object/public/");
    if (idx === -1) return null;
    const after = u.pathname.slice(idx + "/object/public/".length);
    const slash = after.indexOf("/");
    if (slash === -1) return null;
    return after.slice(slash + 1);
  } catch {
    return null;
  }
}
