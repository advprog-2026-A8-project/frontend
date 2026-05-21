"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      if (form.password.length < 8) {
        throw new Error("Password minimal 8 karakter.");
      }
      if (form.password !== confirmPassword) {
        throw new Error("Konfirmasi password tidak sama.");
      }

      await gatewayRequest("auth", "api/auth/register", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
          username: form.username.trim() || undefined,
        },
      });
      setMessage("Registrasi berhasil. Mengarahkan ke login...");
      setForm({ username: "", email: "", password: "" });
      setConfirmPassword("");
      router.push(`/login?registered=1&email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Register</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Buat akun Titiper baru.</p>
          <form onSubmit={onSubmit} className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              Username (opsional)
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Username (opsional)" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Email
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Password
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Konfirmasi Password
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Konfirmasi Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </label>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300" disabled={loading}>
              {loading ? "Loading..." : "Register"}
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
              Login sekarang
            </Link>
            .
          </p>
          {message && <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {error && <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Join JSON
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Daftar Sekarang, Titip Barang Impianmu Lebih Mudah
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Nikmati alur jastip modern: pilih katalog, checkout cepat, bayar via wallet, dan gunakan voucher promo.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            {["Checkout terstruktur", "Voucher promo modular", "Order history transparan"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

