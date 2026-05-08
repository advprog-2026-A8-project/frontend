import Link from "next/link";

export function HomeLandingPage() {
  return (
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <section className="grid gap-6 rounded-3xl border border-white/60 bg-white/85 p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900/75 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
              JSON Final Project
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Belanja Barang Limited Lewat Jastip, Lebih Aman dan Terstruktur
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Platform menghubungkan Titiper, Jastiper, dan Admin dengan alur modular:
              authentication, inventory, order, wallet, dan voucher promo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/catalog" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                Lihat Catalog
              </Link>
              <Link href="/order" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Mulai Order
              </Link>
              <Link href="/register" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Daftar Akun
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="text-sm font-semibold">Order Lifecycle</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              <li className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">PAID</li>
              <li className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">PURCHASED</li>
              <li className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">SHIPPED</li>
              <li className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">COMPLETED</li>
              <li className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                CANCELLED -&gt; Auto Refund
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Authentication", "Register, login, role, KYC"],
            ["Inventory", "Katalog produk dan pencarian"],
            ["Order", "Checkout, monitoring, rating"],
            ["Wallet & Voucher", "Top up, payment, promo discount"],
          ].map(([title, desc]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

