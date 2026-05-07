import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoundForm } from "../_components/round-form";
import { createRoundAction } from "../actions";

export default async function NewRoundPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, basePrice: true, imageUrl: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">New round</h1>
      <Card>
        <CardHeader>
          <CardTitle>Round details</CardTitle>
        </CardHeader>
        <CardContent>
          <RoundForm products={products} action={createRoundAction} />
        </CardContent>
      </Card>
    </div>
  );
}
