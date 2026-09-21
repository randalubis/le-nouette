import { Storefront } from "@/components/storefront";
import { getState } from "@/lib/db/get-state";

export default async function Home() {
  const session = await getState();
  return <Storefront session={session} />;
}
