"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { orderApi } from "@/lib/order-api";
import { clearCheckoutDraft, readCheckoutDraft, readSession } from "@/lib/client-session";
import { Order, OrderStatus } from "@/types/order";

type Role = "titiper" | "jastiper" | "admin";
type ViewMode = "checkout" | "list";

interface OrderDashboardProps {
  initialView?: ViewMode;
}

interface Segment {
  title: string;
  orders: Order[];
  emptyLabel: string;
}

const STATUS_ACTIONS_BY_ROLE: Record<Role, Partial<Record<OrderStatus, OrderStatus>>> = {
  titiper: {},
  jastiper: {
    PAID: "PURCHASED",
    PURCHASED: "SHIPPED",
    SHIPPED: "COMPLETED",
  },
  admin: {
    PENDING: "PAID",
    PAID: "PURCHASED",
    PURCHASED: "SHIPPED",
    SHIPPED: "COMPLETED",
  },
};

const STATUS_BADGES: Record<OrderStatus, string> = {
  PENDING: "bg-slate-200 text-slate-900",
  PAID: "bg-slate-200 text-slate-900",
  PURCHASED: "bg-slate-200 text-slate-900",
  SHIPPED: "bg-slate-200 text-slate-900",
  COMPLETED: "bg-green-200 text-green-900",
  CANCELLED: "bg-slate-200 text-slate-900",
};

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mapRole(raw: string): Role {
  const role = raw.toUpperCase();
  if (role.includes("ADMIN")) return "admin";
  if (role.includes("JASTIPER")) return "jastiper";
  return "titiper";
}

function formatLastUpdate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour12: false });
}

export function OrderDashboard({ initialView = "checkout" }: OrderDashboardProps) {
  const session = useMemo(() => readSession(), []);
  const checkoutDraft = useMemo(() => readCheckoutDraft(), []);
  const role = useMemo(() => mapRole(session.role), [session.role]);
  const canCheckout = role === "titiper";
  const hasCatalogDraft = Boolean(checkoutDraft?.productId && checkoutDraft?.jastiperId);
  const authHeader = useMemo(() => (session.token ? `Bearer ${session.token}` : undefined), [session.token]);
  const sessionUserId = session.userId.trim();

  const [view, setView] = useState<ViewMode>(canCheckout ? initialView : "list");
  const [jastiperId, setJastiperId] = useState("");
  const [useManualIds, setUseManualIds] = useState(!hasCatalogDraft);
  const [checkoutForm, setCheckoutForm] = useState({
    productId: checkoutDraft?.productId ?? "",
    jastiperId: checkoutDraft?.jastiperId ?? "",
    jumlah: 1,
    alamatPengiriman: "",
    voucherCode: "",
    idempotencyKey: newIdempotencyKey(),
  });
  const [selectedProductName] = useState(checkoutDraft?.productName ?? "");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { jastiperRating: number; productRating: number }>>(
    {}
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autoRefreshList, setAutoRefreshList] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const canUseOrder = Boolean(authHeader && sessionUserId);
  const currentJastiperId = role === "jastiper" ? sessionUserId : jastiperId.trim();

  const loadOrders = useCallback(async () => {
    if (!canUseOrder) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (role === "titiper") {
        const [active, history] = await Promise.all([
          orderApi.getTitiperActive(sessionUserId, { authorization: authHeader }),
          orderApi.getTitiperHistory(sessionUserId, { authorization: authHeader }),
        ]);
        setSegments([
          { title: "Order Aktif", orders: active, emptyLabel: "Belum ada order aktif." },
          { title: "Riwayat Order", orders: history, emptyLabel: "Riwayat order masih kosong." },
        ]);
      } else if (role === "jastiper") {
        const [todo, processing, completed] = await Promise.all([
          orderApi.getJastiperTodo(sessionUserId, { authorization: authHeader }),
          orderApi.getJastiperProcessing(sessionUserId, { authorization: authHeader }),
          orderApi.getJastiperCompleted(sessionUserId, { authorization: authHeader }),
        ]);
        setSegments([
          { title: "Perlu Diproses", orders: todo, emptyLabel: "Tidak ada order baru." },
          { title: "Sedang Diproses", orders: processing, emptyLabel: "Tidak ada order in-progress." },
          { title: "Selesai / Dibatalkan", orders: completed, emptyLabel: "Belum ada riwayat selesai." },
        ]);
      } else {
        const active = await orderApi.getAdminActive({ authorization: authHeader });
        setSegments([{ title: "Order Aktif Sistem", orders: active, emptyLabel: "Tidak ada order aktif." }]);
      }
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data order.");
    } finally {
      setLoading(false);
    }
  }, [authHeader, canUseOrder, role, sessionUserId]);

  async function onCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseOrder) return;
    if (!canCheckout) {
      setError("Checkout hanya dapat dilakukan oleh akun TITIPER.");
      return;
    }
    if (!checkoutForm.productId.trim() || !checkoutForm.jastiperId.trim()) {
      setError("Pilih produk dari katalog terlebih dahulu sebelum checkout.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const order = await orderApi.checkout(
        {
          productId: checkoutForm.productId.trim(),
          userId: sessionUserId,
          jastiperId: checkoutForm.jastiperId.trim(),
          jumlah: Number(checkoutForm.jumlah),
          alamatPengiriman: checkoutForm.alamatPengiriman.trim(),
          voucherCode: checkoutForm.voucherCode.trim() || undefined,
        },
        { authorization: authHeader, idempotencyKey: checkoutForm.idempotencyKey.trim() || undefined }
      );
      setMessage(`Checkout berhasil. Order #${order.id} dibuat dengan status ${order.status}.`);
      setCheckoutForm({
        productId: "",
        jastiperId: "",
        jumlah: 1,
        alamatPengiriman: "",
        voucherCode: "",
        idempotencyKey: newIdempotencyKey(),
      });
      setUseManualIds(false);
      clearCheckoutDraft();
      setView("list");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout gagal.");
      setLoading(false);
    }
  }

  async function transitionStatus(order: Order, targetStatus: OrderStatus) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.updateStatus(order.id, targetStatus, { authorization: authHeader });
      setMessage(`Order ${order.id} berhasil diupdate ke ${targetStatus}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
      setLoading(false);
    }
  }

  async function cancelOrder(order: Order) {
    if (!currentJastiperId) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.cancelByJastiper(order.id, currentJastiperId, { authorization: authHeader });
      setMessage(`Order ${order.id} berhasil dibatalkan dan diproses refund.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan order.");
      setLoading(false);
    }
  }

  async function submitRating(order: Order) {
    const draft = ratingDrafts[order.id] ?? { jastiperRating: 5, productRating: 5 };
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.submitRating(
        order.id,
        { userId: sessionUserId, jastiperRating: draft.jastiperRating, productRating: draft.productRating },
        { authorization: authHeader }
      );
      setMessage(`Rating order ${order.id} berhasil disimpan.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal submit rating.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view !== "list") return;
    void loadOrders();
  }, [view, loadOrders]);

  useEffect(() => {
    if (view !== "list" || !autoRefreshList) return;
    const id = window.setInterval(() => {
      void loadOrders();
    }, 20000);
    return () => window.clearInterval(id);
  }, [view, autoRefreshList, loadOrders]);

  if (!canUseOrder) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold">Order</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Session belum lengkap. Pastikan sudah login dan profil user terisi agar order bisa diproses.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/login?next=/order" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              Login
            </Link>
            <Link href="/profile" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Lengkapi Profil
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Order Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Kelola Order Jastip Anda</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Login sebagai: <span className="font-semibold uppercase">{role}</span> | User ID: {sessionUserId}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {canCheckout && (
              <Button variant={view === "checkout" ? "default" : "outline"} onClick={() => setView("checkout")}>
                Checkout
              </Button>
            )}
            <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Lihat Order</Button>
          </div>
        </section>

        {view === "checkout" && canCheckout && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Checkout Baru</h2>
            {selectedProductName && (
              <p className="mt-2 rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700">
                Produk dipilih dari katalog: <span className="font-semibold">{selectedProductName}</span>
              </p>
            )}
            {!hasCatalogDraft && (
              <p className="mt-2 rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700">
                Pilih produk dari halaman katalog agar product dan jastiper otomatis terisi.
              </p>
            )}
            <form onSubmit={onCheckoutSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
              {hasCatalogDraft && !useManualIds ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Produk Checkout</p>
                  <p className="mt-1 font-semibold">{selectedProductName || "-"}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Product ID: <span className="font-mono">{checkoutForm.productId}</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Jastiper ID: <span className="font-mono">{checkoutForm.jastiperId}</span></p>
                </div>
              ) : (
                <>
                  <label className="grid gap-1 text-sm">
                    Product ID
                    <input
                      className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Product ID"
                      value={checkoutForm.productId}
                      onChange={(e) => setCheckoutForm((prev) => ({ ...prev, productId: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Jastiper ID
                    <input
                      className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Jastiper ID"
                      value={checkoutForm.jastiperId}
                      onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jastiperId: e.target.value }))}
                      required
                    />
                  </label>
                </>
              )}
              <label className="grid gap-1 text-sm">
                Jumlah
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" type="number" min={1} placeholder="Jumlah" value={checkoutForm.jumlah} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jumlah: Number(e.target.value) }))} required />
              </label>
              <label className="grid gap-1 text-sm">
                Voucher Code (opsional)
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Voucher Code (opsional)" value={checkoutForm.voucherCode} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, voucherCode: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Alamat Pengiriman
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Alamat Pengiriman" value={checkoutForm.alamatPengiriman} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, alamatPengiriman: e.target.value }))} required />
              </label>
              <div className="rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 md:col-span-2">
                User ID checkout akan otomatis memakai session login: <span className="font-mono">{sessionUserId}</span>
              </div>
              {hasCatalogDraft && (
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <Link href="/catalog" className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300">
                    Ganti produk dari katalog
                  </Link>
                  <button
                    type="button"
                    onClick={() => setUseManualIds((prev) => !prev)}
                    className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
                  >
                    {useManualIds ? "Kunci ke produk katalog" : "Gunakan input ID manual"}
                  </button>
                </div>
              )}
              <label className="grid gap-1 text-sm md:col-span-2">
                Idempotency-Key (opsional)
                <input className="rounded-lg border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Idempotency-Key (opsional)" value={checkoutForm.idempotencyKey} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, idempotencyKey: e.target.value }))} />
              </label>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? "Memproses..." : "Checkout Sekarang"}</Button>
                <Button type="button" variant="outline" onClick={() => setCheckoutForm((prev) => ({ ...prev, idempotencyKey: newIdempotencyKey() }))}>Generate Key</Button>
              </div>
            </form>
          </section>
        )}

        {view === "list" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={autoRefreshList}
                  onChange={(e) => setAutoRefreshList(e.target.checked)}
                />
                Auto refresh (20 detik)
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update terakhir: {formatLastUpdate(lastLoadedAt)}
              </p>
              {role !== "titiper" && role !== "jastiper" && (
                <label className="flex flex-col gap-1 text-sm">
                  Jastiper ID (untuk cancel)
                  <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" value={jastiperId} onChange={(e) => setJastiperId(e.target.value)} />
                </label>
              )}
              <Button onClick={loadOrders} disabled={loading}>{loading ? "Loading..." : "Refresh Data"}</Button>
            </div>

            <div className="space-y-6">
              {segments.map((segment) => (
                <div key={segment.title}>
                  <h3 className="mb-3 text-lg font-semibold">{segment.title}</h3>
                  {segment.orders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">{segment.emptyLabel}</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {segment.orders.map((order) => {
                        const nextStatus = STATUS_ACTIONS_BY_ROLE[role][order.status];
                        const canCancel =
                          role === "jastiper" &&
                          order.jastiperId === sessionUserId &&
                          !["COMPLETED", "CANCELLED"].includes(order.status);
                        const canRate =
                          role === "titiper" &&
                          order.userId === sessionUserId &&
                          order.status === "COMPLETED" &&
                          !order.ratingSubmitted;
                        const ratingDraft = ratingDrafts[order.id] ?? { jastiperRating: 5, productRating: 5 };

                        return (
                          <article key={order.id} className="rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="line-clamp-1 font-mono text-xs text-slate-500">{order.id}</p>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_BADGES[order.status]}`}>{order.status}</span>
                            </div>
                            <p className="text-sm">Product: <span className="font-semibold">{order.productId}</span></p>
                            <p className="text-sm">Titiper: {order.userId}</p>
                            <p className="text-sm">Jastiper: {order.jastiperId}</p>
                            <p className="text-sm">Qty: {order.jumlah}</p>
                            <p className="text-sm">Alamat: {order.alamatPengiriman}</p>
                            {order.ratingSubmitted && (
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                Rating terkirim (Jastiper: {order.jastiperRating ?? "-"}, Produk: {order.productRating ?? "-"})
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {nextStatus && (
                                <Button size="sm" onClick={() => transitionStatus(order, nextStatus)} disabled={loading}>
                                  Mark as {nextStatus}
                                </Button>
                              )}
                              {canCancel && (
                                <Button size="sm" variant="outline" onClick={() => cancelOrder(order)} disabled={loading}>
                                  Cancel + Refund
                                </Button>
                              )}
                            </div>

                            {canRate && (
                              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-xs font-semibold uppercase tracking-wide">Submit Rating</p>
                                <div className="flex gap-2">
                                  <label className="flex flex-col text-xs">
                                    Jastiper
                                    <input type="number" min={1} max={5} value={ratingDraft.jastiperRating} onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [order.id]: { ...ratingDraft, jastiperRating: Number(e.target.value) } }))} className="w-20 rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-950" />
                                  </label>
                                  <label className="flex flex-col text-xs">
                                    Produk
                                    <input type="number" min={1} max={5} value={ratingDraft.productRating} onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [order.id]: { ...ratingDraft, productRating: Number(e.target.value) } }))} className="w-20 rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-950" />
                                  </label>
                                  <Button size="sm" className="self-end" onClick={() => submitRating(order)} disabled={loading}>
                                    Kirim
                                  </Button>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {message && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
      </div>
    </main>
  );
}


