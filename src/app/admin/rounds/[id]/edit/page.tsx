import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoundForm } from "../../_components/round-form";
import { updateRoundAction } from "../../actions";
import { RoundStatusActions } from "./status-actions";

export default async function EditRoundPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const round = await prisma.preorderRound.findUnique({
    where: { id },
    include: {
      items: {
        select: { productId: true, price: true, stockLimit: true, stockSold: true },
      },
    },
  });
  if (!round) notFound();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, basePrice: true, imageUrl: true },
  });

  const action = updateRoundAction.bind(null, round.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">Edit round</h1>
        <Badge>{round.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Round details</CardTitle>
        </CardHeader>
        <CardContent>
          <RoundForm
            initial={{
              id: round.id,
              title: round.title,
              opensAt: round.opensAt,
              closesAt: round.closesAt,
              deliveryDate: round.deliveryDate,
              qrisImageUrl: round.qrisImageUrl,
              bankName: round.bankName,
              bankAccountNumber: round.bankAccountNumber,
              bankAccountHolder: round.bankAccountHolder,
              items: round.items,
            }}
            products={products}
            action={action}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <RoundStatusActions
            id={round.id}
            status={round.status}
            opensAtIso={round.opensAt.toISOString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
