"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { gatewayRequest } from "@/lib/gateway-api";
import { orderApi } from "@/lib/order-api";
import { clearCheckoutDraft, readCheckoutDraft, readSession } from "@/lib/client-session";
import { Order, OrderStatus } from "@/types/order";

type Role = "titiper" | "jastiper" | "admin";
type ViewMode = "checkout" | "buyer" | "jastiper" | "admin";

interface OrderDashboardProps {
  initialView?: "checkout" | "list";
}

interface Segment {
  title: string;
  orders: Order[];
  emptyLabel: string;
}

type ProfileMePayload = {
  data?: {
    role?: string;
  };
  role?: string;
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
  PENDING: "bg-slate-200 text-slate-900",
  PAID: "bg-slate-200 text-slate-900",
  PURCHASED: "bg-slate-200 text-slate-900",
  SHIPPED: "bg-slate-200 text-slate-900",
  COMPLETED: "bg-green-200 text-green-900",
  CANCELLED: "bg-slate-200 text-slate-900",
};

function newRequestKey() {
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(normalized);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function jwtUserId(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const direct = payload.userId;
  if (typeof direct === "string") return direct;
  const fallback = payload.id;
  return typeof fallback === "string" ? fallback : "";
}

function jwtSubject(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const subject = payload.sub;
  return typeof subject === "string" ? subject : "";
}

function isSelfPurchase(userId: string, jastiperId: string) {
  return userId.trim().toLowerCase() === jastiperId.trim().toLowerCase();
}

function isAccessDeniedError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("forbidden") || lower.includes("access denied") || lower.includes("403");
}

export function OrderDashboard({ initialView = "checkout" }: OrderDashboardProps) {
  const session = useMemo(() => readSession(), []);
  const checkoutDraft = useMemo(() => readCheckoutDraft(), []);
  const [profileRole, setProfileRole] = useState("");
  const rawRole = useMemo(() => {
    const roleSet = new Set<string>();
    if (session.role) roleSet.add(session.role.toUpperCase());
    if (profileRole) roleSet.add(profileRole.toUpperCase());
    return Array.from(roleSet).join("|");
  }, [profileRole, session.role]);
  const role = useMemo(() => mapRole(rawRole), [rawRole]);
  const tokenPayload = useMemo(() => decodeJwtPayload(session.token), [session.token]);
  const tokenUserId = useMemo(() => jwtUserId(tokenPayload), [tokenPayload]);
  const tokenSubject = useMemo(() => jwtSubject(tokenPayload), [tokenPayload]);

  const hasBuyerAccess = rawRole.includes("TITIPER") || rawRole.includes("JASTIPER");
  const hasJastiperAccess = rawRole.includes("JASTIPER");
  const isAdmin = role === "admin";

  const authHeader = useMemo(() => (session.token ? `Bearer ${session.token}` : undefined), [session.token]);
  const sessionUserId = session.userId.trim();
  const hasTokenUserIdClaim = Boolean(tokenUserId.trim());
  const tokenUserIdMismatch = Boolean(hasTokenUserIdClaim && sessionUserId && tokenUserId.trim() !== sessionUserId);

  const defaultView: ViewMode = useMemo(() => {
    if (initialView === "checkout" && hasBuyerAccess) return "checkout";
    if (hasBuyerAccess) return "buyer";
    if (hasJastiperAccess) return "jastiper";
    if (isAdmin) return "admin";
    return "buyer";
  }, [hasBuyerAccess, hasJastiperAccess, initialView, isAdmin]);

  const [view, setView] = useState<ViewMode>(defaultView);
  const [checkoutForm, setCheckoutForm] = useState({
    productId: checkoutDraft?.productId ?? "",
    jastiperId: checkoutDraft?.jastiperId ?? "",
    jumlah: 1,
    alamatPengiriman: "",
    voucherCode: "",
  });
  const [selectedProductName] = useState(checkoutDraft?.productName ?? "");
  const hasCatalogDraft = Boolean(checkoutForm.productId.trim() && checkoutForm.jastiperId.trim());
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { jastiperRating: number; productRating: number }>>({});
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentPages, setSegmentPages] = useState<Record<string, number>>({});
  const [segmentPageSize, setSegmentPageSize] = useState(6);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autoRefreshList, setAutoRefreshList] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const canUseOrder = Boolean(authHeader && sessionUserId);
  const jastiperIdentityCandidates = useMemo(() => {
    const candidates = [sessionUserId, tokenUserId.trim(), tokenSubject.trim()];
    const uniq = new Set<string>();
    candidates.forEach((candidate) => {
      if (candidate) uniq.add(candidate);
    });
    return Array.from(uniq);
  }, [sessionUserId, tokenSubject, tokenUserId]);

  const jastiperIdentitySet = useMemo(() => new Set(jastiperIdentityCandidates), [jastiperIdentityCandidates]);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    if (!authHeader) return;
    let cancelled = false;
    const loadProfileRole = async () => {
      try {
        const payload = await gatewayRequest<ProfileMePayload>("auth", "api/profile/me", {
          headers: { Authorization: authHeader },
        });
        const resolvedRole = payload.data?.role ?? payload.role ?? "";
        if (!cancelled && resolvedRole) {
          setProfileRole(resolvedRole);
        }
      } catch {
        // ignore, fallback to session role
      }
    };
    void loadProfileRole();
    return () => {
      cancelled = true;
    };
  }, [authHeader]);

  const loadBuyerSegments = useCallback(async () => {
    const [active, history] = await Promise.all([
      orderApi.getTitiperActive(sessionUserId, { authorization: authHeader }),
      orderApi.getTitiperHistory(sessionUserId, { authorization: authHeader }),
    ]);
    setSegments([
      { title: "Order Aktif Saya", orders: active, emptyLabel: "Belum ada order aktif." },
      { title: "Riwayat Belanja Saya", orders: history, emptyLabel: "Riwayat order masih kosong." },
    ]);
  }, [authHeader, sessionUserId]);

  const loadJastiperSegments = useCallback(async () => {
    const candidateIds = jastiperIdentityCandidates.length > 0 ? jastiperIdentityCandidates : [sessionUserId];
    const [todoBuckets, processingBuckets, completedBuckets] = await Promise.all([
      Promise.all(candidateIds.map((id) => orderApi.getJastiperTodo(id, { authorization: authHeader }).catch(() => []))),
      Promise.all(candidateIds.map((id) => orderApi.getJastiperProcessing(id, { authorization: authHeader }).catch(() => []))),
      Promise.all(candidateIds.map((id) => orderApi.getJastiperCompleted(id, { authorization: authHeader }).catch(() => []))),
    ]);
    const todo = Array.from(new Map(todoBuckets.flat().map((order) => [order.id, order])).values());
    const processing = Array.from(new Map(processingBuckets.flat().map((order) => [order.id, order])).values());
    const completed = Array.from(new Map(completedBuckets.flat().map((order) => [order.id, order])).values());
    setSegments([
      { title: "Perlu Diproses", orders: todo, emptyLabel: "Tidak ada order baru." },
      { title: "Sedang Diproses", orders: processing, emptyLabel: "Tidak ada order in-progress." },
      { title: "Selesai / Dibatalkan", orders: completed, emptyLabel: "Belum ada riwayat selesai." },
    ]);
  }, [authHeader, jastiperIdentityCandidates, sessionUserId]);

  const loadAdminSegments = useCallback(async () => {
    const active = await orderApi.getAdminActive({ authorization: authHeader });
    setSegments([{ title: "Order Aktif Sistem", orders: active, emptyLabel: "Tidak ada order aktif." }]);
  }, [authHeader]);

  const loadCurrentViewData = useCallback(async () => {
    if (!canUseOrder || view === "checkout") return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (view === "buyer") {
        await loadBuyerSegments();
      } else if (view === "jastiper") {
        await loadJastiperSegments();
      } else {
        await loadAdminSegments();
      }
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat data order.";
      if (view === "buyer" && isAccessDeniedError(message)) {
        setError("Akses order sebagai buyer ditolak. Login ulang agar token memuat userId UUID yang benar.");
      } else {
        setError(message);
      }
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, [canUseOrder, loadAdminSegments, loadBuyerSegments, loadJastiperSegments, view]);

  useEffect(() => {
    const nextPages: Record<string, number> = {};
    segments.forEach((segment) => {
      const current = segmentPages[segment.title] ?? 1;
      const maxPage = Math.max(1, Math.ceil(segment.orders.length / segmentPageSize));
      nextPages[segment.title] = Math.min(current, maxPage);
    });
    setSegmentPages(nextPages);
  }, [segments, segmentPageSize]);

  function getSegmentPage(segment: Segment) {
    return segmentPages[segment.title] ?? 1;
  }

  function setSegmentPage(title: string, page: number) {
    setSegmentPages((prev) => ({ ...prev, [title]: page }));
  }

  function paginatedSegmentOrders(segment: Segment) {
    const page = getSegmentPage(segment);
    const start = (page - 1) * segmentPageSize;
    return segment.orders.slice(start, start + segmentPageSize);
  }

  function segmentTotalPages(segment: Segment) {
    return Math.max(1, Math.ceil(segment.orders.length / segmentPageSize));
  }

  async function onCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUseOrder) return;
    if (!hasBuyerAccess) {
      setError("Checkout hanya tersedia untuk akun pembeli.");
      return;
    }
    if (!hasTokenUserIdClaim || tokenUserIdMismatch) {
      setError("Sesi login perlu diperbarui. Silakan logout lalu login ulang.");
      return;
    }
    if (!hasCatalogDraft || !checkoutForm.productId.trim() || !checkoutForm.jastiperId.trim()) {
      setError("Pilih produk dari katalog terlebih dahulu sebelum checkout.");
      return;
    }
    if (isSelfPurchase(sessionUserId, checkoutForm.jastiperId)) {
      setError("Checkout ditolak. Anda tidak bisa membeli produk milik akun sendiri.");
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
        { authorization: authHeader, idempotencyKey: newRequestKey() }
      );
      setMessage(`Checkout berhasil. Order #${order.id} dibuat.`);
      setCheckoutForm({ productId: "", jastiperId: "", jumlah: 1, alamatPengiriman: "", voucherCode: "" });
      clearCheckoutDraft();
      setView("buyer");
      await loadCurrentViewData();
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
      await orderApi.updateStatus(order.id, targetStatus, { authorization: authHeader });
      setMessage(`Order ${order.id} berhasil diupdate ke ${targetStatus}.`);
      await loadCurrentViewData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(order: Order) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await orderApi.cancelByJastiper(order.id, order.jastiperId, { authorization: authHeader });
      setMessage(`Order ${order.id} berhasil dibatalkan dan diproses refund.`);
      await loadCurrentViewData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan order.");
    } finally {
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
      await loadCurrentViewData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal submit rating.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canUseOrder) return;
    void loadCurrentViewData();
  }, [canUseOrder, loadCurrentViewData]);

  useEffect(() => {
    if (view === "checkout" || !autoRefreshList) return;
    const id = window.setInterval(() => {
      void loadCurrentViewData();
    }, 20000);
    return () => window.clearInterval(id);
  }, [view, autoRefreshList, loadCurrentViewData]);

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
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Kelola Order Anda</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {hasBuyerAccess && (
              <Button variant={view === "checkout" ? "default" : "outline"} onClick={() => setView("checkout")}>
                Checkout
              </Button>
            )}
            {hasBuyerAccess && (
              <Button variant={view === "buyer" ? "default" : "outline"} onClick={() => setView("buyer")}>
                Order Saya (Buyer)
              </Button>
            )}
            {hasJastiperAccess && (
              <Button variant={view === "jastiper" ? "default" : "outline"} onClick={() => setView("jastiper")}>
                Kontrol Order Jastiper
              </Button>
            )}
            {isAdmin && (
              <Button variant={view === "admin" ? "default" : "outline"} onClick={() => setView("admin")}>
                Monitoring Admin
              </Button>
            )}
          </div>
        </section>

        {view === "checkout" && hasBuyerAccess && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Checkout Baru</h2>
            {selectedProductName && (
              <p className="mt-2 rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700">
                Produk dipilih: <span className="font-semibold">{selectedProductName}</span>
              </p>
            )}
            {!hasCatalogDraft && (
              <p className="mt-2 rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs text-slate-700">
                Pilih produk dulu dari katalog agar checkout bisa dilanjutkan.
              </p>
            )}

            <form onSubmit={onCheckoutSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Jumlah
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" type="number" min={1} placeholder="Jumlah" value={checkoutForm.jumlah} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, jumlah: Number(e.target.value) }))} required />
              </label>
              <label className="grid gap-1 text-sm">
                Voucher code (opsional)
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Voucher code" value={checkoutForm.voucherCode} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, voucherCode: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Alamat pengiriman
                <input className="rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Alamat pengiriman" value={checkoutForm.alamatPengiriman} onChange={(e) => setCheckoutForm((prev) => ({ ...prev, alamatPengiriman: e.target.value }))} required />
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Link href="/catalog" className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300">
                  {hasCatalogDraft ? "Ganti produk dari katalog" : "Pilih produk dari katalog"}
                </Link>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading || !hasCatalogDraft}>{loading ? "Memproses..." : "Checkout Sekarang"}</Button>
              </div>
            </form>
          </section>
        )}

        {view !== "checkout" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">
                <input type="checkbox" checked={autoRefreshList} onChange={(e) => setAutoRefreshList(e.target.checked)} />
                Auto refresh (20 detik)
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update terakhir: {formatLastUpdate(lastLoadedAt)}</p>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <label className="font-semibold">Per halaman</label>
                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                  value={segmentPageSize}
                  onChange={(e) => setSegmentPageSize(Number(e.target.value))}
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                </select>
              </div>
              <Button onClick={loadCurrentViewData} disabled={loading}>{loading ? "Loading..." : "Refresh Data"}</Button>
            </div>

            <div className="space-y-6">
              {segments.map((segment) => {
                const page = getSegmentPage(segment);
                const totalPages = segmentTotalPages(segment);
                const orders = paginatedSegmentOrders(segment);
                const from = segment.orders.length === 0 ? 0 : (page - 1) * segmentPageSize + 1;
                const to = Math.min(page * segmentPageSize, segment.orders.length);

                return (
                  <div key={segment.title}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{segment.title}</h3>
                      {segment.orders.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Menampilkan {from}-{to} dari {segment.orders.length}
                        </p>
                      )}
                    </div>

                    {segment.orders.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">{segment.emptyLabel}</p>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {orders.map((order) => {
                            const isOwnJastiperOrder = jastiperIdentitySet.has(order.jastiperId);
                            const nextStatus =
                              role === "admin"
                                ? STATUS_ACTIONS_BY_ROLE.admin[order.status]
                                : hasJastiperAccess && isOwnJastiperOrder
                                  ? STATUS_ACTIONS_BY_ROLE.jastiper[order.status]
                                  : undefined;
                            const canCancel =
                              hasJastiperAccess &&
                              isOwnJastiperOrder &&
                              !["COMPLETED", "CANCELLED"].includes(order.status);
                            const canRate =
                              hasBuyerAccess &&
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
                                <p className="text-sm">Produk: <span className="font-semibold">{order.productId}</span></p>
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

                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSegmentPage(segment.title, Math.max(1, page - 1))}
                            disabled={page <= 1}
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                          >
                            Sebelumnya
                          </button>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            Halaman {page} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSegmentPage(segment.title, Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                          >
                            Berikutnya
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {message && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
      </div>
    </main>
  );
}
