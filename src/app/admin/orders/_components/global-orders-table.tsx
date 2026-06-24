"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { adminStatusBadge } from "@/lib/order-status";

export type GlobalOrderRow = {
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
  createdAt: string;
  roundTitle: string;
  roundId: string;
  needsAttention: boolean;
};

export function GlobalOrdersTable({ rows }: { rows: GlobalOrderRow[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.shortCode.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerWhatsApp.toLowerCase().includes(q) ||
        r.roundTitle.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <>
      <div className="border-b border-[var(--border)] p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name, WhatsApp, or round…"
            className="pl-9"
          />
        </div>
        {query && (
          <p className="mt-1 px-1 text-xs text-[var(--muted)]">
            {visible.length} of {rows.length} match
          </p>
        )}
      </div>

      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[var(--background)]">
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Round</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-sm text-[var(--muted)]">
                {rows.length === 0 ? "No orders in this range." : "No orders match the search."}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((o) => (
              <TableRow key={o.id} className={o.status === "CANCELLED" ? "opacity-50" : ""}>
                <TableCell className="font-mono text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    {o.shortCode}
                    {o.needsAttention && (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-[var(--warning)]"
                        title="Proof uploaded — needs verification"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {new Date(o.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </TableCell>
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
                <TableCell>
                  <Link
                    href={`/admin/rounds/${o.roundId}/orders`}
                    className="text-xs text-[var(--foreground)] hover:underline"
                  >
                    {o.roundTitle}
                  </Link>
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
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
