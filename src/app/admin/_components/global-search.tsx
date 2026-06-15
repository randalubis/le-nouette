"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Hit =
  | {
      kind: "order";
      shortCode: string;
      customerName: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }
  | {
      kind: "customer";
      whatsapp: string;
      name: string;
      orderCount: number;
    }
  | {
      kind: "round";
      id: string;
      title: string;
      status: string;
    };

function hitHref(h: Hit): string {
  switch (h.kind) {
    case "order":
      return `/admin/orders/${h.shortCode}`;
    case "customer":
      return `/admin/customers/${encodeURIComponent(h.whatsapp)}`;
    case "round":
      return `/admin/rounds/${h.id}/orders`;
  }
}

function hitTitle(h: Hit): string {
  switch (h.kind) {
    case "order":
      return `${h.shortCode} · ${h.customerName}`;
    case "customer":
      return `${h.name} · ${h.whatsapp}`;
    case "round":
      return h.title;
  }
}

function hitSub(h: Hit): string {
  switch (h.kind) {
    case "order":
      return `Order · ${h.status.replace("_", " ")}`;
    case "customer":
      return `Customer · ${h.orderCount} order${h.orderCount === 1 ? "" : "s"}`;
    case "round":
      return `Round · ${h.status}`;
  }
}

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Cmd-K / Ctrl-K from anywhere in the admin focuses the input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Throttle to one fetch per 200 ms while typing. Clearing hits when the
  // query is too short is done in onChange (an event handler), so this
  // effect never calls setState synchronously in its body.
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      let cancelled = false;
      fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setHits(Array.isArray(data?.hits) ? data.hits : []);
          setActiveIdx(0);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function onListKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[activeIdx]) {
      e.preventDefault();
      const target = hitHref(hits[activeIdx]);
      setOpen(false);
      setQ("");
      router.push(target);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            setOpen(true);
            if (value.trim().length < 2) setHits([]);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onListKey}
          type="search"
          placeholder="Search · ⌘K"
          aria-label="Global admin search"
          className="h-9 w-full rounded-md border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-2.5 pl-8 pr-7 text-sm placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setHits([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-warm-1)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-auto rounded-md border-[0.5px] border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">No matches</li>
          ) : (
            hits.map((h, i) => (
              <li key={`${h.kind}-${i}`}>
                <Link
                  href={hitHref(h)}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`block px-3 py-1.5 text-xs ${
                    i === activeIdx
                      ? "bg-[var(--surface-warm-1)] text-[var(--foreground)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  <p className="truncate font-medium">{hitTitle(h)}</p>
                  <p className="text-[10px] text-[var(--muted)]">{hitSub(h)}</p>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
