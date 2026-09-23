import { notFound } from "next/navigation";
import { FounderShell } from "@/components/founder-shell";
import { ResetSessionCard } from "@/components/reset-session";

export const dynamic = "force-dynamic";

export default async function DevToolsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const secret = process.env.RESET_TOOL_SECRET;
  const authorized = process.env.NODE_ENV !== "production" || (!!secret && key === secret);
  if (!authorized) notFound();
  return (
    <FounderShell active="" title="Dev tools" subtitle="Reset data terlindungi kunci">
      <ResetSessionCard secretKey={key} />
    </FounderShell>
  );
}
