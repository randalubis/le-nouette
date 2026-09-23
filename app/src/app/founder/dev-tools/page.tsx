import { notFound } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { ResetSessionCard } from "@/components/reset-session";

export const dynamic = "force-dynamic";

export default function DevToolsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <FounderShell active="" title="Dev tools" subtitle="Hanya tersedia di lingkungan development">
      <ResetSessionCard />
    </FounderShell>
  );
}
