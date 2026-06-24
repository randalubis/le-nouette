"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });
    const result = (await res.json().catch(() => ({ ok: false, error: "Network error" }))) as
      | { ok: true }
      | { ok: false; error: string };

    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>Le Nouette back office.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Recovery affordance. Admin auth is env-var based (no user table,
              no email/WhatsApp channel), so there's no automated reset — this
              discloses the real, owner-only recovery path instead of a flow
              that can't exist. See src/lib/auth.ts (verifyCredentials). */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowRecovery((v) => !v)}
              aria-expanded={showRecovery}
              aria-controls="recovery-help"
              className="text-sm text-[var(--muted)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
            >
              Forgot email or password?
            </button>
          </div>

          {showRecovery && (
            <div
              id="recovery-help"
              className="mt-3 rounded-[var(--radius-lg)] border-[0.5px] border-[var(--border-strong)] bg-[var(--surface-warm-1)] p-4 text-sm text-[var(--muted)]"
            >
              <p className="font-medium text-[var(--foreground)]">Locked out?</p>
              <p className="mt-1">
                Admin access is set by your hosting environment variables, not a
                database — so there&apos;s no automated reset link. To restore
                access:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4">
                <li>
                  <span className="font-medium text-[var(--foreground)]">Production:</span>{" "}
                  Vercel → your project → <span className="font-medium">Settings → Environment Variables</span> →
                  update{" "}
                  <code className="font-mono text-[13px] text-[var(--foreground)]">ADMIN_PASSWORD</code>{" "}
                  (and/or{" "}
                  <code className="font-mono text-[13px] text-[var(--foreground)]">ADMIN_EMAIL</code>) →
                  redeploy.
                </li>
                <li>
                  <span className="font-medium text-[var(--foreground)]">Local dev:</span>{" "}
                  edit{" "}
                  <code className="font-mono text-[13px] text-[var(--foreground)]">.env.local</code>,
                  then restart the dev server.
                </li>
              </ul>
              <p className="mt-2">
                Your sign-in email is whatever{" "}
                <code className="font-mono text-[13px] text-[var(--foreground)]">ADMIN_EMAIL</code>{" "}
                is set to. Full steps live in{" "}
                <code className="font-mono text-[13px] text-[var(--foreground)]">docs/DEPLOYMENT.md</code>{" "}
                → &ldquo;Rotating secrets&rdquo;.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
