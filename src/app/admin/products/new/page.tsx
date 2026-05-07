import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "../_components/product-form";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">New product</h1>
      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm action={createProductAction} />
        </CardContent>
      </Card>
    </div>
  );
}
