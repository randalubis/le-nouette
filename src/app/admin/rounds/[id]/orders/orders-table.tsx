"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { bulkSetOrderStatusAction } from "@/app/admin/orders/actions";
import { adminStatusBadge } from "@/lib/order-status";

export type OrderRow = {
  id: string;
  shortCode: string;
  customerName: string;
  customerWhatsApp: string;
  paymentMethod: "QRIS" | "BANK_TRANSFER" | "COD";
  status:
    | "PENDING_PAYMENT"
    | "PENDING_CONFIRMATION"
    | "PAID"
    | "CONFIRMED"
    | "DELIVERED"
    | "CANCELLED"
    | "HOLD_EXPIRED";
  totalAmount: number;
  itemCount: number;
};

export function OrdersTable({
  orders,
  emptyMessage,
}: {
  orders: OrderRow[];
  emptyMessage: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingConfirmed, setConfirmingConfirmed] = useState(false);
  const [query, setQuery] = useState("");

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.shortCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerWhatsApp.toLowerCase().includes(q),
    );
  }, [orders, query]);

  const selectableShortCodes = useMemo(
    () => visibleOrders.filter((o) => o.status !== "DELIVERED").map((o) => o.shortCode),
    [visibleOrders],
  );
  const allSelected =
    selectableShortCodes.length > 0 && selected.size === selectableShortCodes.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(selectableShortCodes));
    else setSelected(new Set());
  }

  function toggleOne(shortCode: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(shortCode);
      else next.delete(shortCode);
      return next;
    });
  }

  function runBulk(status: "CONFIRMED" | "CANCELLED") {
    if (selected.size === 0) return;
    startTransition(async () => {
      const result = await bulkSetOrderStatusAction(Array.from(selected), status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === "CANCELLED"
          ? `${selected.size} pesanan dibatalkan.`
          : `${selected.size} pesanan dikonfirmasi.`,
      );
      setSelected(new Set());
      setConfirmingCancel(false);
      setConfirmingConfirmed(false);
    });
  }

  return (
    <>
      <div className="border-b border-[var(--border)] p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name, or WhatsApp…"
            className="pl-9"
          />
        </div>
        {query && (
          <p className="mt-1 px-1 text-xs text-[var(--muted)]">
            {visibleOrders.length} of {orders.length} match
          </p>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-14 z-10 -mx-2 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border-[0.5px] border-[var(--border)] bg-[var(--primary)] px-3 py-2 text-white shadow-md md:top-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{selected.size} dipilih</span>
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                setConfirmingCancel(false);
                setConfirmingConfirmed(false);
              }}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {confirmingCancel ? (
              <>
                <span className="self-center text-xs">
                  Cancel {selected.size} pesanan dan kembalikan stok?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => runBulk("CANCELLED")}
                >
                  Yes, cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Back
                </Button>
              </>
            ) : confirmingConfirmed ? (
              <>
                <span className="self-center text-xs">
                  Mark {selected.size} pesanan sebagai confirmed?
                </span>
                <Button
                  size="sm"
                  variant="default"
                  disabled={pending}
                  onClick={() => runBulk("CONFIRMED")}
                >
                  Yes, confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingConfirmed(false)}
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  disabled={pending}
                  onClick={() => setConfirmingConfirmed(true)}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark confirmed
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setConfirmingCancel(true)}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[var(--background)]">
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => toggleAll(e.currentTarget.checked)}
                disabled={selectableShortCodes.length === 0}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
            </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                {orders.length === 0 ? emptyMessage : "No orders match the search."}
              </TableCell>
            </TableRow>
          ) : (
            visibleOrders.map((o) => {
              const isCancelled = o.status === "CANCELLED";
              const isDelivered = o.status === "DELIVERED";
              const isSelected = selected.has(o.shortCode);
              return (
                <TableRow key={o.id} className={isCancelled ? "opacity-50" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${o.shortCode}`}
                      checked={isSelected}
                      disabled={isDelivered}
                      onChange={(e) => toggleOne(o.shortCode, e.currentTarget.checked)}
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{o.shortCode}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(o.customerWhatsApp)}`}
                      className="hover:underline"
                    >
                      {o.customerName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <a
                      href={formatWhatsAppLink(
                        o.customerWhatsApp,
                        `Halo ${o.customerName}, soal pesanan ${o.shortCode}…`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--success)] hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {o.customerWhatsApp}
                    </a>
                  </TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>{formatIDR(o.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{o.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={adminStatusBadge(o.status)}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/orders/${o.shortCode}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}
