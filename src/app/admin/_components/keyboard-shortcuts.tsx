"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";

// L-12: G-then-X navigation shortcuts modeled on GitHub. Plus Slash to
// focus the global search and ? to open this cheat sheet.
const NAV_SHORTCUTS: Record<string, { path: string; label: string }> = {
  d: { path: "/admin", label: "Dashboard" },
  o: { path: "/admin/orders", label: "All orders" },
  p: { path: "/admin/products", label: "Products" },
  r: { path: "/admin/rounds", label: "Rounds" },
  s: { path: "/admin/settings", label: "Settings" },
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [armedG, setArmedG] = useState(false);

  useEffect(() => {
    let armTimeout: ReturnType<typeof setTimeout> | null = null;

    function isTyping(e: KeyboardEvent): boolean {
      const t = e.target as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      // Ignore shortcuts while the operator is typing in a form.
      if (isTyping(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setShowCheatSheet((s) => !s);
        return;
      }
      if (e.key === "Escape") {
        if (showCheatSheet) setShowCheatSheet(false);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          "input[aria-label='Global admin search']",
        );
        input?.focus();
        input?.select();
        return;
      }

      if (e.key.toLowerCase() === "g" && !armedG) {
        setArmedG(true);
        if (armTimeout) clearTimeout(armTimeout);
        armTimeout = setTimeout(() => setArmedG(false), 1200);
        return;
      }

      if (armedG) {
        const target = NAV_SHORTCUTS[e.key.toLowerCase()];
        setArmedG(false);
        if (armTimeout) clearTimeout(armTimeout);
        if (target) {
          e.preventDefault();
          router.push(target.path);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (armTimeout) clearTimeout(armTimeout);
    };
  }, [router, armedG, showCheatSheet]);

  return (
    <>
      {armedG && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-40 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-md">
          G then…
        </div>
      )}
      {showCheatSheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          onClick={() => setShowCheatSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-[var(--accent)]" />
              <h2 id="shortcuts-title" className="font-medium">
                Keyboard shortcuts
              </h2>
            </div>
            <ul className="space-y-2 text-sm">
              {Object.entries(NAV_SHORTCUTS).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Go to {v.label}</span>
                  <span className="font-mono text-xs">
                    <Kbd>g</Kbd> <Kbd>{k}</Kbd>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                <span className="text-[var(--muted)]">Focus search</span>
                <span className="font-mono text-xs">
                  <Kbd>/</Kbd>{" "}
                  <span className="text-[var(--muted)]">or</span>{" "}
                  <Kbd>⌘ K</Kbd>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Show this cheat sheet</span>
                <Kbd>?</Kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Close any menu / popover</span>
                <Kbd>Esc</Kbd>
              </li>
            </ul>
            <p className="mt-3 text-[10px] text-[var(--muted)]">
              Shortcuts are inactive while typing in a form.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] justify-center rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--foreground)]">
      {children}
    </kbd>
  );
}
