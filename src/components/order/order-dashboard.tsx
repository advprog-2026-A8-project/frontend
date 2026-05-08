"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { orderApi } from "@/lib/order-api";
import { readSession } from "@/lib/client-session";
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
  PENDING: "bg-amber-200 text-amber-900",
  PAID: "bg-emerald-200 text-emerald-900",
  PURCHASED: "bg-sky-200 text-sky-900",
  SHIPPED: "bg-indigo-200 text-indigo-900",
  COMPLETED: "bg-green-200 text-green-900",
  CANCELLED: "bg-rose-200 text-rose-900",
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

export function OrderDashboard({ initialView = "checkout" }: OrderDashboardProps) {
  const session = useMemo(() => readSession(), []);
  const role = useMemo(() => mapRole(session.role), [session.role]);
  const authHeader = useMemo(() => (session.token ? `Bearer ${session.token}` : undefined), [session.token]);
  const sessionUserId = session.userId.trim();

  const [view, setView] = useState<ViewMode>(initialView);
  const [jastiperId, setJastiperId] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({
    productId: "",
    jastiperId: "",
    jumlah: 1,
    alamatPengiriman: "",
    voucherCode: "",
    idempotencyKey: newIdempotencyKey(),
  });
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { jastiperRating: number; productRating: number }>>(
    {}
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canUseOrder = Boolean(authHeader && sessionUserId);
  const currentJastiperId = role === "jastiper" ? sessionUserId : jastiperId.trim();

  async function loadOrders() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data order.");
    } finally {
      setLoading(false);
    }
  }

  async function onCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseOrder) return;
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
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Order Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Kelola Order Jastip Anda</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Login sebagai: <span className="font-semibold uppercase">{role}</span> • User ID: {sessionUserId}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant={view === "checkout" ? "default" : "outline"} onClick={() => setView("checkout")}>Checkout</Button>
            <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Lihat Order</Button>
          </div>
        </section>

        {view === "checkout" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Checkout Baru</h2>
            <form onSubmit={onCheckoutSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Product ID" value={checkoutForm.productId} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, productId: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Jastiper ID" value={checkoutForm.jastiperId} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jastiperId: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" type="number" min={1} placeholder="Jumlah" value={checkoutForm.jumlah} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jumlah: Number(e.target.value) }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Voucher Code (opsional)" value={checkoutForm.voucherCode} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, voucherCode: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950 md:col-span-2" placeholder="Alamat Pengiriman" value={checkoutForm.alamatPengiriman} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, alamatPengiriman: e.target.value }))} required />
              <div className="rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 md:col-span-2">
                User ID checkout akan otomatis memakai session login: <span className="font-mono">{sessionUserId}</span>
              </div>
              <input className="rounded-lg border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 md:col-span-2" placeholder="Idempotency-Key (opsional)" value={checkoutForm.idempotencyKey} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, idempotencyKey: e.target.value }))} />
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

        {message && <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div>
    </main>
  );
}
