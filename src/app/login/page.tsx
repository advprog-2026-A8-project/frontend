"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { clearSession, readSession, writeSession } from "@/lib/client-session";

type LoginResponse = {
  token?: string;
  data?: {
    token?: string;
  };
};

type ProfileResponse = {
  id?: string;
  userId?: string;
  role?: string;
  data?: {
    id?: string;
    userId?: string;
    role?: string;
  };
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function roleFromJwt(payload: Record<string, unknown> | null): string {
  if (!payload) return "TITIPER";
  const directRole = payload.role;
  if (typeof directRole === "string" && directRole.trim()) {
    return directRole;
  }
  return "TITIPER";
}

function userIdFromJwt(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const directUserId = payload.userId;
  if (typeof directUserId === "string" && directUserId.trim()) {
    return directUserId;
  }
  const legacyId = payload.id;
  if (typeof legacyId === "string" && legacyId.trim()) {
    return legacyId;
  }
  return "";
}

function safeNextPath(nextPath: string | null) {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  return nextPath;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await gatewayRequest<LoginResponse>("auth", "api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const token = response?.data?.token ?? response?.token ?? "";
      if (!token) throw new Error("Token login tidak ditemukan dari backend authentication.");

      const jwtPayload = decodeJwtPayload(token);
      const fallbackUserId = userIdFromJwt(jwtPayload);
      const fallbackRole = roleFromJwt(jwtPayload);
      if (!fallbackUserId.trim()) {
        throw new Error("Token login belum memuat claim userId UUID. Restart be-authentication terbaru lalu login ulang.");
      }
      let resolvedUserId = fallbackUserId;
      let resolvedRole = fallbackRole;

      try {
        const profile = await gatewayRequest<ProfileResponse>("auth", "api/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        resolvedUserId =
          profile?.data?.id ??
          profile?.data?.userId ??
          profile?.id ??
          profile?.userId ??
          fallbackUserId;
        resolvedRole = (profile?.data?.role ?? profile?.role ?? fallbackRole) || "TITIPER";
        if (resolvedUserId.trim() && resolvedUserId.trim() !== fallbackUserId.trim()) {
          throw new Error("userId di profile berbeda dengan claim JWT. Sinkronkan be-authentication lalu login ulang.");
        }
      } catch {
        // fallback ke data token saat profile gagal diambil
      }

      writeSession({ token, userId: fallbackUserId, role: resolvedRole || fallbackRole });

      setMessage("Login berhasil. Mengarahkan ke halaman tujuan...");
      const nextPath = safeNextPath(searchParams.get("next"));
      router.push(nextPath);
    } catch (err) {
      clearSession();
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Welcome Back
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Masuk dan Lanjutkan Belanja Jastip Favoritmu
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Pantau order, pakai voucher, dan cek saldo wallet dalam satu akun yang terintegrasi.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            {["Tracking order real-time", "Pembayaran wallet terintegrasi", "Promo voucher untuk checkout"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Login</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Masuk dengan akun be-authentication.</p>
          {searchParams.get("registered") === "1" && (
            <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">
              Registrasi berhasil. Silakan login untuk melanjutkan.
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              Email
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm">
              Password
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
              Register di sini
            </Link>
            .
          </p>
          {message && <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {error && <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
        </section>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="app-page px-4 py-10 sm:px-6">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Menyiapkan halaman login...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

