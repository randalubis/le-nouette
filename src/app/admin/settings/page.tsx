import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

type LatestMigration = { migration_name: string; finished_at: Date | null }[];

async function getAppHealth() {
  const [productCount, roundCount, orderAggregate, lastMigrationRows] =
    await Promise.all([
      prisma.product.count(),
      prisma.preorderRound.count(),
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.$queryRaw<LatestMigration>`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `.catch(() => [] as LatestMigration),
    ]);

  return {
    productCount,
    roundCount,
    orderCount: orderAggregate._count ?? 0,
    revenue: orderAggregate._sum.totalAmount ?? 0,
    lastMigration: lastMigrationRows[0],
  };
}

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, health] = await Promise.all([
    getBusinessSettings(),
    getAppHealth(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">
          Business info, app health, and data backups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
          <CardDescription>
            Edits save immediately and apply to every page that uses these values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App health</CardTitle>
          <CardDescription>Quick numbers across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total orders" value={health.orderCount.toString()} />
            <Stat label="Revenue (active)" value={formatIDR(health.revenue)} />
            <Stat label="Products" value={health.productCount.toString()} />
            <Stat label="Rounds" value={health.roundCount.toString()} />
          </div>
          {health.lastMigration && (
            <p className="mt-4 text-xs text-zinc-500">
              Last migration:{" "}
              <span className="font-mono">{health.lastMigration.migration_name}</span>
              {health.lastMigration.finished_at && (
                <>
                  {" "}
                  · {health.lastMigration.finished_at.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data backups</CardTitle>
          <CardDescription>
            Download a snapshot of all data. Each link returns a CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/api/admin/backup/orders.csv" download>
              <Download className="h-4 w-4" /> All orders
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/backup/products.csv" download>
              <Download className="h-4 w-4" /> All products
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/backup/rounds.csv" download>
              <Download className="h-4 w-4" /> All rounds
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
