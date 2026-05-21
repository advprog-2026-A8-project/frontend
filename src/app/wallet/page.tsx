"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession } from "@/lib/client-session";
import { WalletResponse, WalletTransaction } from "@/types/integration";

function toCurrency(amount: string | number | undefined) {
  const value = Number(amount ?? 0);
  return Number.isNaN(value) ? "Rp 0" : `Rp ${value.toLocaleString("id-ID")}`;
}

function newRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatLastUpdate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour12: false });
}

function formatDateTime(iso: string | undefined) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", { hour12: false });
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
  const role = session.role.toUpperCase();
  const canWithdraw = role.includes("JASTIPER") || role.includes("ADMIN");

  const [amount, setAmount] = useState(10000);
  const [description, setDescription] = useState("Pembayaran order");
  const [statusFilter, setStatusFilter] = useState("");
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topUpInstruction, setTopUpInstruction] = useState<TopUpInitiateResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoRefreshPending, setAutoRefreshPending] = useState(true);
  const [lastHistoryLoadedAt, setLastHistoryLoadedAt] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const statusSummary = useMemo(() => {
    const summary = { PENDING: 0, SUCCESS: 0, FAILED: 0 };
    for (const tx of transactions) {
      const key = tx.status?.toUpperCase();
      if (key === "PENDING" || key === "SUCCESS" || key === "FAILED") {
        summary[key] += 1;
      }
    }
    return summary;
  }, [transactions]);

  const hasPendingTransaction = useMemo(
    () => transactions.some((tx) => tx.status?.toUpperCase() === "PENDING"),
    [transactions]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(transactions.length / pageSize)),
    [transactions.length, pageSize]
  );

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return transactions.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, transactions]);

  const showingFrom = transactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, transactions.length);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login?next=/wallet");
  }, [isAuthenticated, router]);

  const fetchWallet = useCallback(async (): Promise<boolean> => {
    try {
      const data = await gatewayRequest<WalletResponse>("wallet", `wallet/${session.userId}`, {
        headers: { Authorization: auth },
      });
      setWallet(data);
      setWalletMissing(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("not found") || message.includes("tidak ditemukan") || message.includes("belum")) {
        setWallet(null);
        setWalletMissing(true);
        return false;
      }
      throw err;
    }
  }, [auth, session.userId]);

  const fetchHistory = useCallback(async (status = statusFilter) => {
    const path = status ? `wallet/${session.userId}/transactions?status=${status}` : `wallet/${session.userId}/transactions`;
    const data = await gatewayRequest<WalletTransaction[]>("wallet", path, {
      headers: { Authorization: auth },
    });
    setTransactions(data);
    setCurrentPage(1);
    setLastHistoryLoadedAt(new Date().toISOString());
  }, [auth, session.userId, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
      await Promise.all([fetchWallet(), fetchHistory()]);
    }, "Wallet berhasil dibuat.");
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
        headers: { Authorization: auth, "Idempotency-Key": newRequestKey() },
        body: { userId: session.userId, amount },
      });
      setTopUpInstruction(response);
      setStatusFilter("PENDING");
      await fetchHistory("PENDING");
    }, "Top up initiated. Menunggu callback pembayaran.");
  }

  async function pay() {
    await run(async () => {
      await gatewayRequest("wallet", "wallet/pay", {
        method: "POST",
        headers: { Authorization: auth, "Idempotency-Key": newRequestKey() },
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

  async function withdraw() {
    if (!canWithdraw) {
      setError("Withdraw hanya tersedia untuk akun JASTIPER atau ADMIN.");
      return;
    }
    await run(async () => {
      await gatewayRequest("wallet", "wallet/withdraw", {
        method: "POST",
        headers: { Authorization: auth, "X-Role": role },
        body: { userId: session.userId, amount, description },
      });
      await Promise.all([fetchWallet(), fetchHistory()]);
    }, "Withdraw berhasil diproses.");
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadInitial = async () => {
      setLoadingInitial(true);
      setError("");
      try {
        const exists = await fetchWallet();
        if (exists) await fetchHistory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat wallet.");
      } finally {
        setLoadingInitial(false);
      }
    };
    void loadInitial();
  }, [fetchHistory, fetchWallet, isAuthenticated]);

  useEffect(() => {
    if (!autoRefreshPending || !hasPendingTransaction) return;
    const intervalId = window.setInterval(() => {
      void fetchHistory();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [autoRefreshPending, hasPendingTransaction, fetchHistory]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Fitur wallet perlu login terlebih dahulu. Lanjut ke{" "}
          <Link href="/login?next=/wallet" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Wallet Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Dompet Digital</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Saldo dan riwayat transaksi otomatis dimuat saat halaman dibuka.
          </p>
        </div>

        {loadingInitial ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Memuat data wallet...
          </section>
        ) : walletMissing ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Wallet belum tersedia</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Buat wallet satu kali agar bisa top up, bayar, dan melihat histori transaksi.
            </p>
            <button
              onClick={createWallet}
              disabled={loading}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              {loading ? "Membuat..." : "Buat Wallet"}
            </button>
          </section>
        ) : (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Saldo Saat Ini</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{toCurrency(wallet?.balance)}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Riwayat terakhir diperbarui: {formatLastUpdate(lastHistoryLoadedAt)}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status Pembayaran</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending</p>
                    <p className="text-lg font-semibold">{statusSummary.PENDING}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Success</p>
                    <p className="text-lg font-semibold">{statusSummary.SUCCESS}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Failed</p>
                    <p className="text-lg font-semibold">{statusSummary.FAILED}</p>
                  </div>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={autoRefreshPending} onChange={(e) => setAutoRefreshPending(e.target.checked)} />
                  Auto refresh saat ada transaksi pending (10 detik)
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
                <h2 className="text-lg font-semibold">Aksi Wallet</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
                    Nominal
                    <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                  </label>
                  <label className="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
                    Catatan transaksi
                    <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={topUp} disabled={loading} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    Top Up Instan
                  </button>
                  <button onClick={initiateTopUp} disabled={loading} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    Top Up via Payment Gateway
                  </button>
                  <button onClick={pay} disabled={loading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
                    Bayar
                  </button>
                  <button onClick={refund} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
                    Refund
                  </button>
                  {canWithdraw && (
                    <button onClick={withdraw} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
                      Withdraw
                    </button>
                  )}
                </div>
                {!canWithdraw && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Akun TITIPER tidak memiliki fitur withdraw.
                  </p>
                )}
              </section>
            </div>

            {topUpInstruction && (
              <section className="mt-6 rounded-2xl border border-slate-300 bg-slate-100 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Instruksi Pembayaran</h2>
                <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p>Order ID: <span className="font-mono">{topUpInstruction.orderId ?? "-"}</span></p>
                  <p>Payment Token: <span className="font-mono">{topUpInstruction.paymentToken ?? "-"}</span></p>
                  <p>Redirect URL: {topUpInstruction.redirectUrl ? <a className="underline" href={topUpInstruction.redirectUrl} target="_blank" rel="noreferrer">{topUpInstruction.redirectUrl}</a> : "-"}</p>
                </div>
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-semibold">Riwayat Transaksi</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <label className="font-semibold">Filter status</label>
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Semua</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => run(() => fetchHistory(), "Riwayat berhasil diperbarui.")}
                    className="rounded-md border border-slate-300 px-2 py-1 font-semibold dark:border-slate-700"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              {transactions.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                  Belum ada transaksi.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Menampilkan {showingFrom}-{showingTo} dari {transactions.length} transaksi.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <label className="font-semibold">Per halaman</label>
                      <select
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={36}>36</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedTransactions.map((tx) => (
                      <article key={tx.transactionId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="truncate font-mono text-xs text-slate-500">{tx.transactionId}</p>
                        <p className="mt-1 text-sm font-semibold">{tx.type}</p>
                        <p className="text-sm">{toCurrency(tx.amount)}</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tx.status}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                        <p className="mt-2 text-xs text-slate-500">{tx.description || "-"}</p>
                      </article>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Halaman {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {message && <p className="mt-4 rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="mt-4 rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
      </section>
    </main>
  );
}
