import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "../../_components/product-form";
import { updateProductAction } from "../../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const action = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">Edit product</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm initial={product} action={action} />
        </CardContent>
      </Card>
    </div>
  );
}
