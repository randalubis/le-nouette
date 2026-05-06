import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-zinc-500">WhatsApp number:</span>{" "}
            <span className="font-medium">{env.businessWhatsApp() || "(not set)"}</span>
          </p>
          <p className="text-xs text-zinc-500">
            Configure via the <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_BUSINESS_WHATSAPP</code> env var.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Slice 2 / 3</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-zinc-600">
            <li>Global QRIS image upload</li>
            <li>Order management + payment verification</li>
            <li>CSV export</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
