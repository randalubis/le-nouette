"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessSettingsAction } from "../actions";

type Initial = {
  businessName: string;
  whatsappNumber: string;
  deliveryLocation: string;
  aboutBlurb: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const result = await updateBusinessSettingsAction(new FormData(e.currentTarget));
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          required
          maxLength={100}
          defaultValue={initial.businessName}
        />
        <p className="text-xs text-zinc-500">
          Shown in the storefront header and order confirmation message.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsappNumber">WhatsApp number</Label>
        <Input
          id="whatsappNumber"
          name="whatsappNumber"
          inputMode="tel"
          maxLength={20}
          defaultValue={initial.whatsappNumber}
          placeholder="628123456789"
        />
        <p className="text-xs text-zinc-500">
          Used for the customer&apos;s &ldquo;Kirim ke admin via WhatsApp&rdquo; button.
          Saved in canonical international format (62 prefix).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryLocation">Default delivery location</Label>
        <Input
          id="deliveryLocation"
          name="deliveryLocation"
          maxLength={200}
          defaultValue={initial.deliveryLocation}
          placeholder="Kantor — pantry lantai 3"
        />
        <p className="text-xs text-zinc-500">
          Shown to the customer on the order confirmation page (optional).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aboutBlurb">About blurb (storefront empty state)</Label>
        <Textarea
          id="aboutBlurb"
          name="aboutBlurb"
          maxLength={500}
          rows={3}
          defaultValue={initial.aboutBlurb}
          placeholder="Cemilan rumahan setiap minggu. Buka preorder Senin & Kamis."
        />
        <p className="text-xs text-zinc-500">
          Shown when no round is open. Optional — leave empty to fall back to the default copy.
        </p>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
