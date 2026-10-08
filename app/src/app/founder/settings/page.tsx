import { FounderShell } from "@/components/founder-shell";
import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const c = await getSettings();
  const { logoBase64, logoMime, ...text } = c;
  return (
    <FounderShell active="Pengaturan" title="Pengaturan" subtitle="Info perusahaan untuk invoice">
      <SettingsForm initial={text} logoSrc={logoBase64 && logoMime ? `data:${logoMime};base64,${logoBase64}` : null} />
    </FounderShell>
  );
}
