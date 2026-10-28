"use client";

import gsap from "gsap";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Only follow `next` back into the app, never anywhere else — it comes from a
 * URL query param (proxy.ts sets it when redirecting from `/app/*`), so it is
 * attacker-controlled. Whitelisting the one prefix proxy.ts ever produces
 * closes off open-redirect tricks like `//evil.com` or `/\evil.com`.
 */
function safeNextPath(value: string | null): string {
  return value?.startsWith("/app") ? value : "/app/dashboard";
}

interface DemoCredentials {
  email: string;
  password: string;
}

export function LoginForm({ prefill }: { prefill?: DemoCredentials | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [password, setPassword] = useState(prefill?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setEmail(prefill.email);
    setPassword(prefill.password);
  }, [prefill]);

  useEffect(() => {
    if (!error || !formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { x: -10 },
      { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" },
    );
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Format email atau password belum sesuai.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? "Email atau password tidak valid.");
        setLoading(false);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(safeNextPath(next));
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@instansi.go.id"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative mt-1.5">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Sembunyikan password" : "Tampilkan password"
            }
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-muted"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
          </>
        ) : (
          <>
            Masuk <LogIn className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
