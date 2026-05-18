import Link from "next/link";

export function HomeLandingPage() {
  return (
    <main className="app-page">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900/75">
          <p className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            JSON Final Project
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            Platform Jastip yang Ringkas, Aman, dan Mudah Dipakai
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            Cari produk titipan, checkout cepat, bayar lewat wallet, lalu pantau status order dalam satu alur.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/catalog" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              Mulai dari Catalog
            </Link>
            <Link href="/order" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Cek Order
            </Link>
            <Link href="/register" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Daftar Akun
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="rounded-full border border-slate-300 px-2.5 py-1 dark:border-slate-700">Authentication</span>
            <span className="rounded-full border border-slate-300 px-2.5 py-1 dark:border-slate-700">Inventory</span>
            <span className="rounded-full border border-slate-300 px-2.5 py-1 dark:border-slate-700">Order</span>
            <span className="rounded-full border border-slate-300 px-2.5 py-1 dark:border-slate-700">Wallet</span>
            <span className="rounded-full border border-slate-300 px-2.5 py-1 dark:border-slate-700">Voucher</span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Pilih Produk", "Cari barang titipan dari katalog dan pilih sesuai kebutuhan."],
            ["2", "Checkout & Bayar", "Gunakan voucher jika ada, lalu bayar dengan wallet."],
            ["3", "Pantau Status", "Lihat progres order sampai selesai atau refund jika batal."],
          ].map(([step, title, desc]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-500">Langkah {step}</p>
              <p className="mt-1 text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Akses Cepat Sesuai Peran</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Link href="/profile" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Titiper: Kelola Profil
            </Link>
            <Link href="/jastiper" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Jastiper: Kelola Katalog
            </Link>
            <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Admin: Kontrol Sistem
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
