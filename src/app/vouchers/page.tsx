"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession } from "@/lib/client-session";

type Voucher = {
  code: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  quota: number;
  termsAndConditions?: string;
  expiryDate?: string;
  active: boolean;
};

type ValidateResult = {
  valid?: boolean;
  discountAmount?: number;
  finalPrice?: number;
  finalAmount?: number;
  message?: string;
};

function formatCurrency(value: number) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export default function VouchersPage() {
  const session = useMemo(() => readSession(), []);
  const role = session.role.toUpperCase();
  const isAdmin = role.includes("ADMIN");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [check, setCheck] = useState({ code: "", amount: 100000 });
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeCount = useMemo(() => vouchers.filter((item) => item.active).length, [vouchers]);

  async function run<T>(action: () => Promise<T>, onSuccess: (data: T) => void, successMessage?: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await action();
      onSuccess(data);
      if (successMessage) setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi voucher gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailable() {
    await run(
      () => gatewayRequest<Voucher[]>("voucher", "api/vouchers/available"),
      (data) => setVouchers(data),
      "Daftar voucher aktif berhasil dimuat."
    );
  }

  async function validate(event: FormEvent) {
    event.preventDefault();
    await run(
      () => gatewayRequest<ValidateResult>("voucher", "api/vouchers/validate", { method: "POST", body: check }),
      (data) => setResult(data),
      "Validasi voucher selesai."
    );
  }

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Voucher & Promo</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Maksimalkan Belanja dengan Promo</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Cek voucher aktif, validasi diskon, lalu pakai saat checkout order.</p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            Session role: <span className="font-semibold uppercase">{session.role || "TITIPER"}</span>
          </div>
          {isAdmin && (
            <p className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-xs text-slate-700">
              Aksi create/update voucher dipusatkan di{" "}
              <Link href="/admin" className="font-semibold underline">
                Admin Center
              </Link>{" "}
              agar kontrak integrasi tetap satu pintu.
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Total Voucher</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{vouchers.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Active</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Nominal Cek</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(check.amount)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={loadAvailable} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {loading ? "Loading..." : "Load Available Voucher"}
            </button>
          </div>

          <form onSubmit={validate} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-sm">
              Kode voucher
              <input className="rounded-xl border border-slate-300 p-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Kode voucher" value={check.code} onChange={(e) => setCheck((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Nominal belanja
              <input className="rounded-xl border border-slate-300 p-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950" type="number" min={0} placeholder="Nominal belanja" value={check.amount} onChange={(e) => setCheck((p) => ({ ...p, amount: Number(e.target.value) }))} required />
            </label>
            <button disabled={loading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
              Validasi
            </button>
          </form>

          {message && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}

          {result && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hasil Validasi</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Status: {result.valid ? "Valid" : "Tidak Valid"}</p>
              {typeof result.discountAmount === "number" && <p className="text-sm text-slate-700 dark:text-slate-300">Diskon: {formatCurrency(result.discountAmount)}</p>}
              {typeof (result.finalPrice ?? result.finalAmount) === "number" && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Total Setelah Diskon: {formatCurrency((result.finalPrice ?? result.finalAmount) as number)}
                </p>
              )}
              {result.message && <p className="text-sm text-slate-700 dark:text-slate-300">Catatan: {result.message}</p>}
            </div>
          )}
        </div>

        <section className="mt-6">
          {vouchers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              Belum ada voucher ditampilkan. Klik <span className="font-semibold">Load Available Voucher</span>.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vouchers.map((voucher) => (
                <article key={voucher.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{voucher.code}</h2>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                      {voucher.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{voucher.discountType} | {voucher.discountValue}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p>Min. belanja: {formatCurrency(voucher.minPurchase)}</p>
                    <p>Sisa kuota: {voucher.quota}</p>
                    <p>Expiry: {voucher.expiryDate ? voucher.expiryDate : "-"}</p>
                  </div>
                  <button onClick={() => setCheck((prev) => ({ ...prev, code: voucher.code }))} className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold transition hover:border-slate-500 dark:border-slate-700">
                    Pakai Kode Ini
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
