"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { orderApi } from "@/lib/order-api";
import { readSession } from "@/lib/client-session";
import { Order } from "@/types/order";

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

const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-slate-200 text-slate-700",
  PAID: "bg-slate-200 text-slate-700",
  PURCHASED: "bg-slate-200 text-slate-700",
  SHIPPED: "bg-slate-200 text-slate-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export default function JastiperPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const auth = session.token ? `Bearer ${session.token}` : "";
  const role = session.role.toUpperCase();
  const isAuthenticated = Boolean(session.token && session.userId);
  const canAccess = role.includes("JASTIPER") || role.includes("ADMIN");

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [todoOrders, setTodoOrders] = useState<Order[]>([]);
  const [processingOrders, setProcessingOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock: 1,
    originCountry: "",
    purchaseDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function resetProductForm() {
    setProductForm({
      id: "",
      name: "",
      description: "",
      price: 0,
      stock: 1,
      originCountry: "",
      purchaseDate: "",
    });
  }

  function selectProductToForm(product: Product) {
    setProductForm({
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
      router.replace("/login?next=/jastiper");
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
      setError(err instanceof Error ? err.message : "Aksi Jastiper gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    const data = await gatewayRequest<Product[]>("inventory", "api/products/my-catalog", {
      headers: {
        "X-User-Id": session.userId,
        "X-User-Role": role || "JASTIPER",
      },
    });
    setCatalog(data);
  }

  async function loadOrders() {
    const [todo, processing, completed] = await Promise.all([
      orderApi.getJastiperTodo(session.userId, { authorization: auth }),
      orderApi.getJastiperProcessing(session.userId, { authorization: auth }),
      orderApi.getJastiperCompleted(session.userId, { authorization: auth }),
    ]);
    setTodoOrders(todo);
    setProcessingOrders(processing);
    setCompletedOrders(completed);
  }

  async function loadAll() {
    await run(async () => {
      await Promise.all([loadCatalog(), loadOrders()]);
    }, "Dashboard jastiper berhasil dimuat.");
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await gatewayRequest("inventory", "api/products/create", {
        method: "POST",
        headers: {
          "X-User-Id": session.userId,
          "X-User-Role": role || "JASTIPER",
        },
        body: {
          name: productForm.name,
          description: productForm.description,
          price: productForm.price,
          stock: productForm.stock,
          originCountry: productForm.originCountry,
          purchaseDate: productForm.purchaseDate,
        },
      });
      await loadCatalog();
      resetProductForm();
    }, "Produk baru berhasil dibuat.");
  }

  async function updateProduct() {
    if (!productForm.id.trim()) {
      setError("Product ID wajib diisi untuk update.");
      return;
    }
    await run(async () => {
      await gatewayRequest("inventory", `api/products/update/${productForm.id.trim()}`, {
        method: "PUT",
        headers: {
          "X-User-Id": session.userId,
          "X-User-Role": role || "JASTIPER",
        },
        body: {
          name: productForm.name,
          description: productForm.description,
          price: productForm.price,
          stock: productForm.stock,
          originCountry: productForm.originCountry,
          purchaseDate: productForm.purchaseDate,
        },
      });
      await loadCatalog();
    }, "Produk berhasil diupdate.");
  }

  async function deleteProduct() {
    if (!productForm.id.trim()) {
      setError("Product ID wajib diisi untuk delete.");
      return;
    }
    await run(async () => {
      await gatewayRequest("inventory", `api/products/delete/${productForm.id.trim()}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": session.userId,
          "X-User-Role": role || "JASTIPER",
        },
      });
      await loadCatalog();
      resetProductForm();
    }, "Produk berhasil dihapus.");
  }

  async function deleteProductById(productId: string) {
    if (!productId) return;
    const confirmed = window.confirm("Hapus produk ini dari katalog Anda?");
    if (!confirmed) return;
    await run(async () => {
      await gatewayRequest("inventory", `api/products/delete/${productId}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": session.userId,
          "X-User-Role": role || "JASTIPER",
        },
      });
      await loadCatalog();
      if (productForm.id === productId) resetProductForm();
    }, "Produk berhasil dihapus.");
  }

  async function moveOrderStatus(orderId: string, targetStatus: "PURCHASED" | "SHIPPED" | "COMPLETED") {
    await run(async () => {
      await orderApi.updateStatus(orderId, targetStatus, { authorization: auth });
      await loadOrders();
    }, `Order ${orderId} diupdate ke ${targetStatus}.`);
  }

  async function cancelOrder(orderId: string) {
    await run(async () => {
      await orderApi.cancelByJastiper(orderId, session.userId, { authorization: auth });
      await loadOrders();
    }, `Order ${orderId} dibatalkan dan refund diproses.`);
  }

  useEffect(() => {
    if (isAuthenticated && canAccess) {
      loadAll();
    }
  }, [isAuthenticated, canAccess]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Fitur jastiper perlu login terlebih dahulu. Lanjut ke{" "}
          <Link href="/login?next=/jastiper" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-sm text-slate-700 shadow-sm">
          Halaman ini untuk role JASTIPER/ADMIN. Role Anda saat ini: <span className="font-semibold">{session.role || "TITIPER"}</span>.
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Jastiper Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Kelola Katalog dan Order Jastip</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">User: {session.userId}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={loadAll} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {loading ? "Loading..." : "Refresh Dashboard"}
            </button>
            <Link href="/catalog" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Buka Catalog Publik
            </Link>
            <Link href="/order" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Buka Order Center
            </Link>
          </div>
        </div>

        {message && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Manajemen Produk Jastiper</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Untuk update atau delete, pilih produk dari kartu katalog agar form terisi otomatis.
          </p>
          <form onSubmit={createProduct} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Product ID (update/delete)" value={productForm.id} onChange={(e) => setProductForm((prev) => ({ ...prev, id: e.target.value }))} />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nama produk" value={productForm.name} onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Deskripsi" value={productForm.description} onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))} required />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={0} placeholder="Harga" value={productForm.price} onChange={(e) => setProductForm((prev) => ({ ...prev, price: Number(e.target.value) }))} required />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="number" min={0} placeholder="Stok" value={productForm.stock} onChange={(e) => setProductForm((prev) => ({ ...prev, stock: Number(e.target.value) }))} required />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Negara asal" value={productForm.originCountry} onChange={(e) => setProductForm((prev) => ({ ...prev, originCountry: e.target.value }))} required />
            <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="date" placeholder="Tanggal beli (yyyy-mm-dd)" value={productForm.purchaseDate} onChange={(e) => setProductForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} required />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900" disabled={loading}>
                Create
              </button>
              <button type="button" onClick={updateProduct} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Update
              </button>
              <button type="button" onClick={deleteProduct} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Delete
              </button>
              <button type="button" onClick={resetProductForm} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Reset Form
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Katalog Saya</h2>
            {catalog.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Belum ada produk di katalog jastiper.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {catalog.map((item) => (
                  <article key={item.id ?? `${item.name}-${item.purchaseDate}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500">{item.id}</p>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                    <p className="text-sm">Stok {item.stock} | Rp {Number(item.price).toLocaleString("id-ID")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectProductToForm(item)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                      >
                        Edit dari Form
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProductById(item.id ?? "")}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700"
                      >
                        Hapus Produk
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Antrian Order Jastiper</h2>
            <div className="mt-3 space-y-4">
              {[
                { title: "Perlu Diproses", items: todoOrders },
                { title: "Sedang Diproses", items: processingOrders },
                { title: "Selesai / Dibatalkan", items: completedOrders },
              ].map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{group.title}</p>
                  {group.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">Kosong.</p>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((order) => (
                        <article key={order.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs text-slate-500">{order.id}</p>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ORDER_STATUS_STYLE[order.status] ?? "bg-slate-200 text-slate-700"}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">Product: {order.productId}</p>
                          <p className="text-sm">Qty: {order.jumlah}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {order.status === "PAID" && (
                              <button onClick={() => moveOrderStatus(order.id, "PURCHASED")} disabled={loading} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                                Mark PURCHASED
                              </button>
                            )}
                            {order.status === "PURCHASED" && (
                              <button onClick={() => moveOrderStatus(order.id, "SHIPPED")} disabled={loading} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                                Mark SHIPPED
                              </button>
                            )}
                            {order.status === "SHIPPED" && (
                              <button onClick={() => moveOrderStatus(order.id, "COMPLETED")} disabled={loading} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                                Mark COMPLETED
                              </button>
                            )}
                            {!["COMPLETED", "CANCELLED"].includes(order.status) && (
                              <button onClick={() => cancelOrder(order.id)} disabled={loading} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                Cancel + Refund
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

