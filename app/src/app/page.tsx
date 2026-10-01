import { Storefront } from "@/components/storefront";
import { getState } from "@/lib/db/get-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getState();
  return <Storefront storeStatus={session.storeStatus} calendar={session.calendar} />;
}
