"use client";

import { FormEvent, useMemo, useState } from "react";
import { gatewayRequest } from "@/lib/gateway-api";

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

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-orange-100/60 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Cari Produk Titipan dari Berbagai Negara</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Jelajahi barang titipan, cek stok, lalu lanjutkan checkout di modul order.
          </p>

          <form onSubmit={doSearch} className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950"
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

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-orange-700">Total Produk</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{products.length}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-orange-700">Ready Stock</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{inStockCount}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-orange-700">Mode</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{search.trim() ? "Search" : "Browse"}</p>
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

          {message && <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </section>

        <section className="mt-6">
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              Tidak ada produk yang cocok dengan filter saat ini. Coba ubah filter atau klik <span className="font-semibold">Reset Filter</span>.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article key={product.id ?? `${product.name}-${product.purchaseDate}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs text-slate-500">{product.id ?? "-"}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
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
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
