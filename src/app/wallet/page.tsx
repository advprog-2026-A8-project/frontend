"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession } from "@/lib/client-session";
import { WalletResponse, WalletTransaction } from "@/types/integration";

function toCurrency(amount: string | number | undefined) {
  const value = Number(amount ?? 0);
  return Number.isNaN(value) ? "Rp 0" : `Rp ${value.toLocaleString("id-ID")}`;
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type TopUpInitiateResponse = {
  paymentToken?: string;
  redirectUrl?: string;
  orderId?: string;
};

export default function WalletPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const isAuthenticated = Boolean(session.token && session.userId);
  const auth = session.token ? `Bearer ${session.token}` : "";

  const [amount, setAmount] = useState(10000);
  const [description, setDescription] = useState("Pembayaran order");
  const [statusFilter, setStatusFilter] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey());
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topUpInstruction, setTopUpInstruction] = useState<TopUpInitiateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login?next=/wallet");
  }, [isAuthenticated, router]);

  async function fetchWallet() {
    const data = await gatewayRequest<WalletResponse>("wallet", `wallet/${session.userId}`, {
      headers: { Authorization: auth },
    });
    setWallet(data);
  }

  async function fetchHistory(status = statusFilter) {
    const path = status ? `wallet/${session.userId}/transactions?status=${status}` : `wallet/${session.userId}/transactions`;
    const data = await gatewayRequest<WalletTransaction[]>("wallet", path, {
      headers: { Authorization: auth },
    });
    setTransactions(data);
  }

  async function run(action: () => Promise<void>, successMessage?: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await action();
      if (successMessage) setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi wallet gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function createWallet() {
    await run(async () => {
      await gatewayRequest("wallet", `wallet?userId=${session.userId}`, {
        method: "POST",
        headers: { Authorization: auth },
      });
      await fetchWallet();
    }, "Wallet berhasil dibuat.");
  }

  async function loadWalletAndHistory() {
    await run(async () => {
      await Promise.all([fetchWallet(), fetchHistory()]);
    });
  }

  async function topUp() {
    await run(async () => {
      await gatewayRequest("wallet", "wallet/topup", {
        method: "POST",
        headers: { Authorization: auth },
        body: { userId: session.userId, amount },
      });
      await Promise.all([fetchWallet(), fetchHistory()]);
    }, "Top up instan berhasil.");
  }

  async function initiateTopUp() {
    await run(async () => {
      const response = await gatewayRequest<TopUpInitiateResponse>("wallet", "wallet/topup/initiate", {
        method: "POST",
        headers: { Authorization: auth, "Idempotency-Key": idempotencyKey },
        body: { userId: session.userId, amount },
      });
      setTopUpInstruction(response);
      setIdempotencyKey(newIdempotencyKey());
      await fetchHistory("PENDING");
    }, "Top up initiate berhasil. Menunggu callback settlement/failure.");
  }

  async function pay() {
    await run(async () => {
      await gatewayRequest("wallet", "wallet/pay", {
        method: "POST",
        headers: { Authorization: auth, "Idempotency-Key": `${Date.now()}-${amount}` },
        body: { userId: session.userId, amount, description },
      });
      await Promise.all([fetchWallet(), fetchHistory()]);
    }, "Pembayaran berhasil.");
  }

  async function refund() {
    await run(async () => {
      await gatewayRequest("wallet", "wallet/refund", {
        method: "POST",
        headers: { Authorization: auth },
        body: { userId: session.userId, amount, description },
      });
      await Promise.all([fetchWallet(), fetchHistory()]);
    }, "Refund berhasil diproses.");
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Fitur wallet perlu login terlebih dahulu. Lanjut ke{" "}
          <Link href="/login?next=/wallet" className="font-semibold text-orange-600 hover:underline dark:text-orange-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-orange-100/60 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Wallet Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Dompet Digital Jastip</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">User: {session.userId}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={createWallet} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
              Buat Wallet
            </button>
            <button onClick={loadWalletAndHistory} disabled={loading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {loading ? "Loading..." : "Muat Saldo + Riwayat"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Saldo Saat Ini</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{toCurrency(wallet?.balance)}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <h2 className="text-lg font-semibold">Transaksi Wallet</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={description} onChange={(e) => setDescription(e.target.value)} />
              <select className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                <option value="PENDING">PENDING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
              <input className="rounded-md border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={topUp} disabled={loading} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Top Up Instan
              </button>
              <button onClick={initiateTopUp} disabled={loading} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                Top Up Initiate
              </button>
              <button onClick={pay} disabled={loading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
                Bayar
              </button>
              <button onClick={refund} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
                Refund
              </button>
              <button onClick={() => run(() => fetchHistory(), "Riwayat berhasil difilter.")} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
                Terapkan Filter Status
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">`Top Up Initiate` akan membuat transaksi status `PENDING` menunggu callback payment gateway.</p>
          </section>
        </div>

        {topUpInstruction && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-900">Top Up Instruction</h2>
            <div className="mt-3 space-y-1 text-sm text-amber-900">
              <p>Order ID: <span className="font-mono">{topUpInstruction.orderId ?? "-"}</span></p>
              <p>Payment Token: <span className="font-mono">{topUpInstruction.paymentToken ?? "-"}</span></p>
              <p>Redirect URL: {topUpInstruction.redirectUrl ? <a className="underline" href={topUpInstruction.redirectUrl} target="_blank" rel="noreferrer">{topUpInstruction.redirectUrl}</a> : "-"}</p>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Riwayat Transaksi</h2>
          {transactions.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
              Belum ada transaksi. Klik &quot;Muat Saldo + Riwayat&quot; untuk mengambil data terbaru.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {transactions.map((tx) => (
                <article key={tx.transactionId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="truncate font-mono text-xs text-slate-500">{tx.transactionId}</p>
                  <p className="mt-1 text-sm font-semibold">{tx.type}</p>
                  <p className="text-sm">{toCurrency(tx.amount)}</p>
                  <p className={`text-xs font-semibold ${tx.status === "PENDING" ? "text-amber-600" : tx.status === "SUCCESS" ? "text-emerald-600" : "text-rose-600"}`}>{tx.status}</p>
                  <p className="mt-2 text-xs text-slate-500">{tx.description || "-"}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {message && <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </section>
    </main>
  );
}
