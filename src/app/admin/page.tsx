"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { orderApi } from "@/lib/order-api";
import { readSession } from "@/lib/client-session";
import { Order } from "@/types/order";

type ApiEnvelope<T> = {
  message?: string;
  data?: T;
};

type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  accountStatus?: string;
  kycStatus?: string;
};

type Voucher = {
  code: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  quota: number;
  expiryDate?: string;
  active: boolean;
};

type Product = {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  originCountry: string;
  purchaseDate: string;
  jastiperId?: string;
};

type OrderSummary = {
  totalOrders?: number;
  activeOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  pendingOrders?: number;
  paidOrders?: number;
  purchasedOrders?: number;
  shippedOrders?: number;
};

function normalizeLocalDateTime(value: string) {
  if (!value.trim()) return undefined;
  return value.length === 16 ? `${value}:00` : value;
}

function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    const maybe = payload as ApiEnvelope<T>;
    return (maybe.data ?? ([] as unknown)) as T;
  }
  return payload as T;
}

export default function AdminPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const auth = session.token ? `Bearer ${session.token}` : "";
  const role = session.role.toUpperCase();
  const isAuthenticated = Boolean(session.token && session.userId);
  const isAdmin = role.includes("ADMIN");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [adminForm, setAdminForm] = useState({
    userId: "",
    decision: "APPROVED",
    status: "ACTIVE",
    delta: 1,
  });
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    quota: 1,
    discountValue: 10,
    minPurchase: 0,
    discountType: "PERCENTAGE",
    expiryDate: "",
    termsAndConditions: "",
    additionalQuota: 0,
    isActive: true,
    newExpiry: "",
  });
  const [inventoryForm, setInventoryForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock: 0,
    originCountry: "",
    purchaseDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function pickUser(user: UserProfile) {
    setAdminForm((prev) => ({
      ...prev,
      userId: user.id,
      status: user.accountStatus ?? prev.status,
    }));
  }

  function pickVoucher(voucher: Voucher) {
    setVoucherForm((prev) => ({
      ...prev,
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: Number(voucher.discountValue ?? prev.discountValue),
      minPurchase: Number(voucher.minPurchase ?? prev.minPurchase),
      quota: Number(voucher.quota ?? prev.quota),
      isActive: Boolean(voucher.active),
    }));
  }

  function pickInventoryProduct(product: Product) {
    setInventoryForm({
      id: product.id ?? "",
      name: product.name ?? "",
      description: product.description ?? "",
      price: Number(product.price ?? 0),
      stock: Number(product.stock ?? 0),
      originCountry: product.originCountry ?? "",
      purchaseDate: product.purchaseDate ?? "",
    });
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/admin");
    }
  }, [isAuthenticated, router]);

  async function run(action: () => Promise<void>, ok?: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await action();
      if (ok) setMessage(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi admin gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const payload = await gatewayRequest<ApiEnvelope<UserProfile[]>>("auth", "api/profile/admin/users", {
      headers: { Authorization: auth },
    });
    setUsers(unwrapData<UserProfile[]>(payload));
  }

  async function loadOrderData() {
    const [orderSummary, active] = await Promise.all([
      gatewayRequest<OrderSummary>("order", "api/orders/admin/summary", {
        headers: { Authorization: auth },
      }),
      orderApi.getAdminActive({ authorization: auth }),
    ]);
    setSummary(orderSummary);
    setActiveOrders(active);
  }

  async function loadVouchers() {
    const data = await gatewayRequest<Voucher[]>("voucher", "api/vouchers/admin/list", {
      headers: { Authorization: auth },
    });
    setVouchers(data);
  }

  async function loadInventoryProducts() {
    const data = await gatewayRequest<Product[]>("inventory", "api/products/list");
    setInventoryProducts(data);
  }

  async function loadAll() {
    await run(async () => {
      await Promise.all([loadUsers(), loadOrderData(), loadVouchers(), loadInventoryProducts()]);
    }, "Admin center berhasil dimuat.");
  }

  async function adminAction(path: string, body: unknown, ok: string) {
    await run(async () => {
      await gatewayRequest("auth", path, {
        method: "PUT",
        headers: { Authorization: auth },
        body,
      });
      await loadUsers();
    }, ok);
  }

  async function createVoucher(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await gatewayRequest("voucher", "api/vouchers/admin/create", {
        method: "POST",
        headers: { Authorization: auth },
        body: {
          code: voucherForm.code.trim().toUpperCase(),
          quota: voucherForm.quota,
          discountValue: voucherForm.discountValue,
          minPurchase: voucherForm.minPurchase,
          discountType: voucherForm.discountType,
          expiryDate: normalizeLocalDateTime(voucherForm.expiryDate),
          termsAndConditions: voucherForm.termsAndConditions,
        },
      });
      await loadVouchers();
    }, "Voucher baru berhasil dibuat.");
  }

  async function updateVoucher() {
    const code = voucherForm.code.trim().toUpperCase();
    if (!code) {
      setError("Code voucher wajib diisi untuk update.");
      return;
    }
    await run(async () => {
      await gatewayRequest("voucher", `api/vouchers/admin/update/${code}`, {
        method: "PATCH",
        headers: { Authorization: auth },
        body: {
          additionalQuota: voucherForm.additionalQuota,
          isActive: voucherForm.isActive,
          newExpiry: normalizeLocalDateTime(voucherForm.newExpiry),
        },
      });
      await loadVouchers();
    }, "Voucher berhasil diupdate.");
  }

  async function updateInventoryProduct() {
    const id = inventoryForm.id.trim();
    if (!id) {
      setError("Product ID wajib diisi untuk update produk.");
      return;
    }
    await run(async () => {
      await gatewayRequest("inventory", `api/products/update/${id}`, {
        method: "PUT",
        headers: { Authorization: auth },
        body: {
          name: inventoryForm.name,
          description: inventoryForm.description,
          price: inventoryForm.price,
          stock: inventoryForm.stock,
          originCountry: inventoryForm.originCountry,
          purchaseDate: inventoryForm.purchaseDate,
        },
      });
      await loadInventoryProducts();
    }, "Produk inventory berhasil diupdate.");
  }

  async function deleteInventoryProduct() {
    const id = inventoryForm.id.trim();
    if (!id) {
      setError("Product ID wajib diisi untuk delete produk.");
      return;
    }
    await run(async () => {
      await gatewayRequest("inventory", `api/products/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
      await loadInventoryProducts();
      setInventoryForm((prev) => ({ ...prev, id: "" }));
    }, "Produk inventory berhasil dihapus.");
  }

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAll();
    }
  }, [isAuthenticated, isAdmin]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Fitur admin perlu login terlebih dahulu. Lanjut ke{" "}
          <Link href="/login?next=/admin" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-sm text-slate-700 shadow-sm">
          Halaman ini hanya untuk role ADMIN. Role Anda saat ini: <span className="font-semibold">{session.role || "TITIPER"}</span>.
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Admin Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Kontrol Modul Backend JSON</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Role: {session.role} | User: {session.userId}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={loadAll} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {loading ? "Loading..." : "Refresh Admin Data"}
            </button>
            <Link href="/profile" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Buka Profile
            </Link>
            <Link href="/vouchers" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Buka Voucher Page
            </Link>
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            {summary ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(summary).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="text-lg font-semibold">{String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Belum ada ringkasan order.</p>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Active Orders ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Tidak ada order aktif.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {activeOrders.slice(0, 8).map((order) => (
                  <article key={order.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-mono text-xs text-slate-500">{order.id}</p>
                    <p className="text-sm">Product: {order.productId}</p>
                    <p className="text-sm">Status: {order.status}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Inventory Moderation</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Admin dapat memperbarui atau menghapus produk langsung dari katalog global.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm">
              Product ID
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={inventoryForm.id} onChange={(e) => setInventoryForm((prev) => ({ ...prev, id: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Nama Produk
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={inventoryForm.name} onChange={(e) => setInventoryForm((prev) => ({ ...prev, name: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Deskripsi
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={inventoryForm.description} onChange={(e) => setInventoryForm((prev) => ({ ...prev, description: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Harga
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={0} value={inventoryForm.price} onChange={(e) => setInventoryForm((prev) => ({ ...prev, price: Number(e.target.value) }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Stok
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={0} value={inventoryForm.stock} onChange={(e) => setInventoryForm((prev) => ({ ...prev, stock: Number(e.target.value) }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Negara Asal
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={inventoryForm.originCountry} onChange={(e) => setInventoryForm((prev) => ({ ...prev, originCountry: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Tanggal Beli
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="date" value={inventoryForm.purchaseDate} onChange={(e) => setInventoryForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => run(loadInventoryProducts, "Katalog inventory berhasil dimuat.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Refresh Inventory
            </button>
            <button onClick={updateInventoryProduct} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Update Produk
            </button>
            <button onClick={deleteInventoryProduct} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700">
              Delete Produk
            </button>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {inventoryProducts.map((product) => (
              <article key={product.id ?? `${product.name}-${product.purchaseDate}`} className={`rounded-lg border p-3 ${inventoryForm.id === product.id ? "border-slate-500 bg-slate-50 dark:border-slate-500 dark:bg-slate-950/60" : "border-slate-200 dark:border-slate-800"}`}>
                <p className="truncate text-xs text-slate-500">{product.id}</p>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{product.description}</p>
                <p className="text-xs">Harga: {product.price} | Stok: {product.stock}</p>
                <p className="text-xs">Asal: {product.originCountry}</p>
                <p className="text-xs">Jastiper: {product.jastiperId ?? "-"}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => pickInventoryProduct(product)}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                  >
                    Pilih sebagai Target
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Admin User Controls</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Pilih user dari daftar di bawah agar target User ID terisi otomatis.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">
              Target User ID
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Target User ID" value={adminForm.userId} onChange={(e) => setAdminForm((prev) => ({ ...prev, userId: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              KYC Decision
              <select
                className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={adminForm.decision}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, decision: e.target.value }))}
              >
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="APPROVE">APPROVE</option>
                <option value="REJECT">REJECT</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Status akun
              <select
                className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={adminForm.status}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="BANNED">BANNED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Delta statistik
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" placeholder="Delta" value={adminForm.delta} onChange={(e) => setAdminForm((prev) => ({ ...prev, delta: Number(e.target.value) }))} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => adminAction("api/profile/admin/role/upgrade", { userId: adminForm.userId }, "Role user berhasil di-upgrade.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Upgrade
            </button>
            <button onClick={() => adminAction("api/profile/admin/role/demote", { userId: adminForm.userId }, "Role user berhasil di-demote.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Demote
            </button>
            <button onClick={() => adminAction("api/profile/admin/kyc/decision", { userId: adminForm.userId, decision: adminForm.decision }, "Keputusan KYC berhasil diproses.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              KYC Decision
            </button>
            <button onClick={() => adminAction("api/profile/admin/status", { userId: adminForm.userId, status: adminForm.status }, "Status akun berhasil diperbarui.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Set Status
            </button>
            <button onClick={() => adminAction("api/profile/admin/jastiper/stats", { userId: adminForm.userId, delta: adminForm.delta }, "Statistik jastiper berhasil diperbarui.")} disabled={loading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              Set Stats
            </button>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => (
              <article key={user.id} className={`rounded-lg border p-3 ${adminForm.userId === user.id ? "border-slate-500 bg-slate-50 dark:border-slate-500 dark:bg-slate-950/60" : "border-slate-200 dark:border-slate-800"}`}>
                <p className="font-semibold">{user.username}</p>
                <p className="truncate text-xs text-slate-500">{user.id}</p>
                <p className="text-xs">{user.email}</p>
                <p className="text-xs">Role: {user.role}</p>
                <p className="text-xs">Account: {user.accountStatus ?? "-"}</p>
                <p className="text-xs">KYC: {user.kycStatus ?? "-"}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => pickUser(user)}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                  >
                    Pilih sebagai Target
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Voucher Admin Controls</h2>
          <form onSubmit={createVoucher} className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm">
              Code
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Code" value={voucherForm.code} onChange={(e) => setVoucherForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Quota
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" placeholder="Quota" value={voucherForm.quota} onChange={(e) => setVoucherForm((prev) => ({ ...prev, quota: Number(e.target.value) }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Discount Value
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" placeholder="Discount Value" value={voucherForm.discountValue} onChange={(e) => setVoucherForm((prev) => ({ ...prev, discountValue: Number(e.target.value) }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Minimum Purchase
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" placeholder="Min Purchase" value={voucherForm.minPurchase} onChange={(e) => setVoucherForm((prev) => ({ ...prev, minPurchase: Number(e.target.value) }))} required />
            </label>
            <label className="grid gap-1 text-sm">
              Discount Type
              <select
                className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={voucherForm.discountType}
                onChange={(e) => setVoucherForm((prev) => ({ ...prev, discountType: e.target.value }))}
              >
                <option value="PERCENTAGE">PERCENTAGE</option>
                <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Expiry Date
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="datetime-local" placeholder="Expiry Date" value={voucherForm.expiryDate} onChange={(e) => setVoucherForm((prev) => ({ ...prev, expiryDate: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              Terms and Conditions
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Terms and Conditions" value={voucherForm.termsAndConditions} onChange={(e) => setVoucherForm((prev) => ({ ...prev, termsAndConditions: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700">
              <input type="checkbox" checked={voucherForm.isActive} onChange={(e) => setVoucherForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Active
            </label>
            <label className="grid gap-1 text-sm">
              Additional Quota
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" placeholder="Additional Quota" value={voucherForm.additionalQuota} onChange={(e) => setVoucherForm((prev) => ({ ...prev, additionalQuota: Number(e.target.value) }))} />
            </label>
            <label className="grid gap-1 text-sm">
              New Expiry
              <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="datetime-local" placeholder="New Expiry" value={voucherForm.newExpiry} onChange={(e) => setVoucherForm((prev) => ({ ...prev, newExpiry: e.target.value }))} />
            </label>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900" disabled={loading}>
                Create Voucher
              </button>
              <button type="button" onClick={updateVoucher} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Update Voucher
              </button>
            </div>
          </form>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {vouchers.map((voucher) => (
              <article key={voucher.code} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{voucher.code}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${voucher.active ? "bg-slate-200 text-slate-700" : "bg-slate-200 text-slate-700"}`}>
                    {voucher.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs">{voucher.discountType} | {voucher.discountValue}</p>
                <p className="text-xs">Min Purchase: {voucher.minPurchase}</p>
                <p className="text-xs">Quota: {voucher.quota}</p>
                <p className="text-xs">Expiry: {voucher.expiryDate ?? "-"}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => pickVoucher(voucher)}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                  >
                    Isi ke Form
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

