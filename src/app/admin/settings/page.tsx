import { requireAdmin } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getBusinessSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">
          Business info shown to customers across the storefront.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
          <CardDescription>
            Edits save immediately and apply to every page that uses these values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
