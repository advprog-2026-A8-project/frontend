"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession, writeSession } from "@/lib/client-session";

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

      const prev = readSession();
      writeSession({ ...prev, token, userId: "", role: prev.role || "TITIPER" });

      try {
        const profile = await gatewayRequest<ProfileResponse>("auth", "api/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userId = profile?.data?.id ?? profile?.data?.userId ?? profile?.id ?? profile?.userId ?? "";
        const role = (profile?.data?.role ?? profile?.role ?? prev.role) || "TITIPER";
        writeSession({ token, userId, role });
      } catch {
        writeSession({ ...prev, token });
      }

      setMessage("Login berhasil. Mengarahkan ke halaman tujuan...");
      const nextPath = safeNextPath(searchParams.get("next"));
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-orange-100/60 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
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
              <div key={item} className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-slate-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Login</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Masuk dengan akun be-authentication.</p>
          {searchParams.get("registered") === "1" && (
            <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
              Registrasi berhasil. Silakan login untuk melanjutkan.
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-5 grid gap-3">
            <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-orange-600 hover:underline dark:text-orange-300">
              Register di sini
            </Link>
            .
          </p>
          {message && <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </section>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] px-4 py-10 dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)] sm:px-6">
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
