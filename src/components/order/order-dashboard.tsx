"use client";

import { FormEvent, useMemo, useState } from "react";
import { DarkModeToggle } from "@/components/common/darkmode-toggle";
import { Button } from "@/components/ui/button";
import { orderApi } from "@/lib/order-api";
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

const ROLE_LABELS: Record<Role, string> = {
  titiper: "Titiper",
  jastiper: "Jastiper",
  admin: "Admin",
};

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

export function OrderDashboard({ initialView = "checkout" }: OrderDashboardProps) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [role, setRole] = useState<Role>("titiper");
  const [userId, setUserId] = useState("user-001");
  const [jastiperId, setJastiperId] = useState("jastiper-001");

  const [checkoutForm, setCheckoutForm] = useState({
    productId: "",
    userId: "user-001",
    jastiperId: "jastiper-001",
    jumlah: 1,
    alamatPengiriman: "",
    idempotencyKey: newIdempotencyKey(),
  });

  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { jastiperRating: number; productRating: number }>>(
    {}
  );

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const roleNeedsUser = role === "titiper";
  const roleNeedsJastiper = role === "jastiper";

  const canLoad = useMemo(() => {
    if (roleNeedsUser) return Boolean(userId.trim());
    if (roleNeedsJastiper) return Boolean(jastiperId.trim());
    return true;
  }, [role, roleNeedsJastiper, roleNeedsUser, userId, jastiperId]);

  async function loadOrders() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (role === "titiper") {
        const [active, history] = await Promise.all([
          orderApi.getTitiperActive(userId.trim()),
          orderApi.getTitiperHistory(userId.trim()),
        ]);
        setSegments([
          { title: "Order Aktif", orders: active, emptyLabel: "Tidak ada order aktif." },
          { title: "Riwayat Order", orders: history, emptyLabel: "Riwayat order kosong." },
        ]);
      } else if (role === "jastiper") {
        const [todo, processing, completed] = await Promise.all([
          orderApi.getJastiperTodo(jastiperId.trim()),
          orderApi.getJastiperProcessing(jastiperId.trim()),
          orderApi.getJastiperCompleted(jastiperId.trim()),
        ]);
        setSegments([
          { title: "To-Do (PAID)", orders: todo, emptyLabel: "Tidak ada order menunggu proses." },
          { title: "Processing", orders: processing, emptyLabel: "Tidak ada order yang diproses." },
          { title: "Completed / Cancelled", orders: completed, emptyLabel: "Belum ada order selesai." },
        ]);
      } else {
        const active = await orderApi.getAdminActive();
        setSegments([{ title: "Admin Active Orders", orders: active, emptyLabel: "Tidak ada order aktif." }]);
      }

      setMessage("Data order berhasil diperbarui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat order.");
    } finally {
      setLoading(false);
    }
  }

  async function onCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const order = await orderApi.checkout(
        {
          productId: checkoutForm.productId.trim(),
          userId: checkoutForm.userId.trim(),
          jastiperId: checkoutForm.jastiperId.trim(),
          jumlah: Number(checkoutForm.jumlah),
          alamatPengiriman: checkoutForm.alamatPengiriman.trim(),
        },
        checkoutForm.idempotencyKey.trim() || undefined
      );
      setMessage(`Checkout sukses. Order ID: ${order.id} (${order.status}).`);
      setCheckoutForm((prev) => ({ ...prev, productId: "", alamatPengiriman: "", idempotencyKey: newIdempotencyKey() }));
      setRole("titiper");
      setUserId(order.userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function transitionStatus(order: Order, targetStatus: OrderStatus) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.updateStatus(order.id, targetStatus);
      setMessage(`Status order ${order.id} diubah ke ${targetStatus}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status order.");
      setLoading(false);
    }
  }

  async function cancelOrder(order: Order) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.cancelByJastiper(order.id, jastiperId.trim());
      setMessage(`Order ${order.id} berhasil dibatalkan.`);
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
      await orderApi.submitRating(order.id, {
        userId: userId.trim(),
        jastiperRating: draft.jastiperRating,
        productRating: draft.productRating,
      });
      setMessage(`Rating order ${order.id} berhasil dikirim.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal submit rating.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Frontend Adpro</p>
            <h1 className="text-2xl font-semibold">Order Workspace</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view === "checkout" ? "default" : "outline"} onClick={() => setView("checkout")}>Checkout</Button>
            <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Order List</Button>
            <DarkModeToggle />
          </div>
        </header>

        {view === "checkout" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">Checkout Order</h2>
            <form onSubmit={onCheckoutSubmit} className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Product ID" value={checkoutForm.productId} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, productId: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="User ID" value={checkoutForm.userId} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, userId: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Jastiper ID" value={checkoutForm.jastiperId} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jastiperId: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" type="number" min={1} placeholder="Jumlah" value={checkoutForm.jumlah} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jumlah: Number(e.target.value) }))} required />
              <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950 md:col-span-2" placeholder="Alamat Pengiriman" value={checkoutForm.alamatPengiriman} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, alamatPengiriman: e.target.value }))} required />
              <input className="rounded-lg border border-slate-300 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 md:col-span-2" placeholder="Idempotency-Key (opsional)" value={checkoutForm.idempotencyKey} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, idempotencyKey: e.target.value }))} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? "Memproses..." : "Checkout"}</Button>
                <Button type="button" variant="outline" onClick={() => setCheckoutForm((prev) => ({ ...prev, idempotencyKey: newIdempotencyKey() }))}>Generate Key</Button>
              </div>
            </form>
          </section>
        )}

        {view === "list" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Role
                <select className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              {roleNeedsUser && (
                <label className="flex flex-col gap-1 text-sm">
                  User ID
                  <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                </label>
              )}

              {roleNeedsJastiper && (
                <label className="flex flex-col gap-1 text-sm">
                  Jastiper ID
                  <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" value={jastiperId} onChange={(e) => setJastiperId(e.target.value)} required />
                </label>
              )}

              <Button onClick={loadOrders} disabled={!canLoad || loading}>{loading ? "Loading..." : "Refresh"}</Button>
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
                          order.jastiperId === jastiperId.trim() &&
                          !["COMPLETED", "CANCELLED"].includes(order.status);

                        const canRate =
                          role === "titiper" &&
                          order.userId === userId.trim() &&
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
                                    <input
                                      type="number"
                                      min={1}
                                      max={5}
                                      value={ratingDraft.jastiperRating}
                                      onChange={(e) =>
                                        setRatingDrafts((prev) => ({
                                          ...prev,
                                          [order.id]: {
                                            ...ratingDraft,
                                            jastiperRating: Number(e.target.value),
                                          },
                                        }))
                                      }
                                      className="w-20 rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-950"
                                    />
                                  </label>
                                  <label className="flex flex-col text-xs">
                                    Produk
                                    <input
                                      type="number"
                                      min={1}
                                      max={5}
                                      value={ratingDraft.productRating}
                                      onChange={(e) =>
                                        setRatingDrafts((prev) => ({
                                          ...prev,
                                          [order.id]: {
                                            ...ratingDraft,
                                            productRating: Number(e.target.value),
                                          },
                                        }))
                                      }
                                      className="w-20 rounded border border-slate-300 p-1 dark:border-slate-700 dark:bg-slate-950"
                                    />
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
