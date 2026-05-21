import Link from "next/link";

export function HomeLandingPage() {
  return (
    <main className="app-page">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900/80">
          <p className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-300">
            JaStip Online Nasional
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Belanja Titipan Luar Negeri Tanpa Ribet
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Temukan produk dari jastiper terverifikasi, checkout cepat, bayar lewat wallet, dan pantau status order dari satu tempat.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/catalog" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              Mulai Belanja
            </Link>
            <Link href="/order" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Cek Order
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Katalog Terkurasi</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Produk ditampilkan dengan stok, harga, dan asal negara secara jelas agar keputusan belanja lebih cepat.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Checkout Aman</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Gunakan voucher saat tersedia dan selesaikan pembayaran melalui wallet dengan histori transaksi yang rapi.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status Transparan</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Update progres order dari diproses hingga selesai bisa dipantau langsung di dashboard order.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
