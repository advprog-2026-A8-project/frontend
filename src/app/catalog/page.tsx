"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { isSessionAuthenticated, readSession, writeCheckoutDraft } from "@/lib/client-session";

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

function formatCurrency(value: number) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function formatLastUpdate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour12: false });
}

export default function CatalogPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const role = session.role.toUpperCase();
  const canCheckoutAsTitiper = isSessionAuthenticated(session) && role.includes("TITIPER");
  const [search, setSearch] = useState("");
  const [jastiperSearch, setJastiperSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name-asc">("default");

  const availableCountries = useMemo(
    () => Array.from(new Set(products.map((item) => item.originCountry).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (stockFilter === "in-stock") {
      data = data.filter((item) => item.stock > 0);
    } else if (stockFilter === "out-of-stock") {
      data = data.filter((item) => item.stock <= 0);
    }

    if (countryFilter !== "all") {
      data = data.filter((item) => item.originCountry === countryFilter);
    }

    const min = Number(minPrice);
    if (minPrice !== "" && !Number.isNaN(min)) {
      data = data.filter((item) => Number(item.price) >= min);
    }

    const max = Number(maxPrice);
    if (maxPrice !== "" && !Number.isNaN(max)) {
      data = data.filter((item) => Number(item.price) <= max);
    }

    if (sortBy === "price-asc") {
      data.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-desc") {
      data.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "name-asc") {
      data.sort((a, b) => a.name.localeCompare(b.name, "id"));
    }

    return data;
  }, [products, stockFilter, countryFilter, minPrice, maxPrice, sortBy]);

  const inStockCount = useMemo(() => products.filter((item) => item.stock > 0).length, [products]);

  function resetFilters() {
    setStockFilter("all");
    setCountryFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("default");
  }

  async function run(action: () => Promise<Product[]>, successMessage?: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await action();
      setProducts(data);
      setLastLoadedAt(new Date().toISOString());
      if (successMessage) setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat katalog.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    await run(() => gatewayRequest<Product[]>("inventory", "api/products/list"), "Katalog terbaru berhasil dimuat.");
  }

  async function doSearch(event?: FormEvent) {
    event?.preventDefault();
    const keyword = search.trim();
    if (!keyword) {
      await loadAll();
      return;
    }
    await run(
      () => gatewayRequest<Product[]>("inventory", `api/products/search?name=${encodeURIComponent(keyword)}`),
      `Hasil pencarian untuk "${keyword}" ditampilkan.`
    );
  }

  async function searchByJastiper(event?: FormEvent) {
    event?.preventDefault();
    const jastiperId = jastiperSearch.trim();
    if (!jastiperId) {
      await loadAll();
      return;
    }
    await run(
      () => gatewayRequest<Product[]>("inventory", `api/products/jastiper/${encodeURIComponent(jastiperId)}`),
      `Katalog jastiper ${jastiperId} berhasil dimuat.`
    );
  }

  async function quickPickJastiper(jastiperId?: string) {
    if (!jastiperId) return;
    setJastiperSearch(jastiperId);
    await run(
      () => gatewayRequest<Product[]>("inventory", `api/products/jastiper/${encodeURIComponent(jastiperId)}`),
      `Katalog jastiper ${jastiperId} berhasil dimuat.`
    );
  }

  function checkoutFromProduct(product: Product) {
    if (!canCheckoutAsTitiper) {
      if (!isSessionAuthenticated(session)) {
        router.push("/login?next=/catalog");
      }
      return;
    }
    if (!product.id || !product.jastiperId) return;
    writeCheckoutDraft({
      productId: product.id,
      jastiperId: product.jastiperId,
      productName: product.name,
    });
    router.push("/order");
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh || search.trim() || jastiperSearch.trim()) return;
    const id = window.setInterval(async () => {
      try {
        const data = await gatewayRequest<Product[]>("inventory", "api/products/list");
        setProducts(data);
        setLastLoadedAt(new Date().toISOString());
      } catch {
        // keep existing product state if polling fails
      }
    }, 15000);

    return () => window.clearInterval(id);
  }, [autoRefresh, search, jastiperSearch]);

  return (
    <main className="app-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Cari Produk Titipan dari Berbagai Negara</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Jelajahi barang titipan, cek stok live, lalu checkout langsung dari kartu produk.
          </p>
          {!canCheckoutAsTitiper && (
            <p className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-3 text-xs text-slate-700">
              Checkout hanya tersedia untuk akun TITIPER yang sudah login.
            </p>
          )}

          <form onSubmit={doSearch} className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Cari nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" disabled={loading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
              {loading ? "Mencari..." : "Search"}
            </button>
            <button type="button" onClick={loadAll} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {loading ? "Loading..." : "Load All"}
            </button>
          </form>
          <form onSubmit={searchByJastiper} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Cari berdasarkan Jastiper ID..."
              value={jastiperSearch}
              onChange={(e) => setJastiperSearch(e.target.value)}
            />
            <button type="submit" disabled={loading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-slate-700">
              {loading ? "Mencari..." : "Cari Jastiper"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-700">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto refresh stok (15 detik)
            </label>
            <span>Terakhir update: {formatLastUpdate(lastLoadedAt)}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Total Produk</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{products.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Ready Stock</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{inStockCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Mode</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{jastiperSearch.trim() ? "Jastiper" : search.trim() ? "Search" : "Browse"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filter Produk</p>
              <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-600">
                Reset Filter
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as "all" | "in-stock" | "out-of-stock")}> 
                <option value="all">Semua Stok</option>
                <option value="in-stock">In Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                <option value="all">Semua Negara</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>

              <input className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" type="number" min={0} placeholder="Harga minimum" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <input className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" type="number" min={0} placeholder="Harga maksimum" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />

              <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={sortBy} onChange={(e) => setSortBy(e.target.value as "default" | "price-asc" | "price-desc" | "name-asc")}> 
                <option value="default">Urutkan</option>
                <option value="price-asc">Harga Termurah</option>
                <option value="price-desc">Harga Termahal</option>
                <option value="name-asc">Nama A-Z</option>
              </select>
            </div>
          </div>

          {message && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
        </section>

        <section className="mt-6">
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              Tidak ada produk yang cocok dengan filter saat ini. Coba ubah filter atau klik <span className="font-semibold">Reset Filter</span>.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const checkoutDisabled =
                  !product.id || !product.jastiperId || product.stock <= 0 || !canCheckoutAsTitiper;
                return (
                  <article key={product.id ?? `${product.name}-${product.purchaseDate}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs text-slate-500">{product.id ?? "-"}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock > 0 ? "bg-slate-200 text-slate-700" : "bg-slate-200 text-slate-700"}`}>
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{product.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{product.description}</p>
                    <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(product.price)}</p>
                    <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      <p>Stok: {product.stock}</p>
                      <p>Asal: {product.originCountry}</p>
                      <p>Jastiper: {product.jastiperId ?? "-"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!product.jastiperId || loading}
                      onClick={() => void quickPickJastiper(product.jastiperId)}
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                    >
                      Lihat Katalog Jastiper Ini
                    </button>
                    <button
                      type="button"
                      disabled={checkoutDisabled}
                      onClick={() => checkoutFromProduct(product)}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:disabled:bg-slate-700"
                    >
                      {canCheckoutAsTitiper ? "Checkout Produk Ini" : "Login TITIPER untuk Checkout"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

