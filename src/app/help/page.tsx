import Link from "next/link";

const quickLinks = [
  { href: "/catalog", label: "Buka Catalog" },
  { href: "/order", label: "Lanjut ke Order" },
  { href: "/wallet", label: "Kelola Wallet" },
  { href: "/vouchers", label: "Cek Voucher" },
];

export default function HelpPage() {
  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Pusat Bantuan</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Panduan Penggunaan JSON</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Halaman ini merangkum alur utama agar Titiper, Jastiper, dan Admin bisa memakai platform dengan mudah.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section id="checkout" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cara Checkout</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
              <li>Login menggunakan akun Titiper.</li>
              <li>Buka halaman Catalog lalu pilih produk yang diinginkan.</li>
              <li>Klik tombol checkout pada kartu produk agar product dan jastiper otomatis terisi.</li>
              <li>Pastikan Anda tidak checkout produk milik jastiper dengan ID yang sama dengan akun Anda.</li>
              <li>Isi jumlah, alamat pengiriman, dan voucher (opsional), lalu submit checkout.</li>
              <li>Pantau status order pada menu Order hingga selesai.</li>
            </ol>
          </section>

          <section id="refund" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Kebijakan Refund</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Refund diproses saat order dibatalkan sesuai aturan modul Order dan Wallet.</li>
              <li>Status transaksi wallet akan tercatat pada riwayat agar bisa dilacak.</li>
              <li>Gunakan Idempotency Key untuk mencegah transaksi refund ganda.</li>
            </ul>
          </section>

          <section id="security" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Keamanan Transaksi</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Selalu login melalui halaman resmi dan jangan bagikan token akun.</li>
              <li>Pastikan saldo wallet cukup sebelum pembayaran order.</li>
              <li>Cek ulang nominal, alamat, dan voucher sebelum checkout.</li>
              <li>Gunakan role sesuai akun: Titiper, Jastiper, atau Admin.</li>
            </ul>
          </section>

          <section id="kyc" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">KYC dan Verifikasi Akun</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Ajukan KYC dari halaman Profile dengan nama lengkap dan dokumen valid.</li>
              <li>Admin akan memproses status KYC (approve/reject) melalui modul Authentication.</li>
              <li>Setelah disetujui, user dapat mengakses fitur Jastiper sesuai role.</li>
            </ul>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">FAQ Singkat</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <summary className="cursor-pointer font-semibold">Kenapa checkout bisa gagal?</summary>
              <p className="mt-2">Umumnya karena token login tidak valid, stok habis, data user/jastiper tidak sesuai kontrak backend, atau mencoba membeli produk milik jastiper sendiri.</p>
            </details>
            <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <summary className="cursor-pointer font-semibold">Kapan harus top up wallet?</summary>
              <p className="mt-2">Sebelum pembayaran order jika saldo tidak cukup. Gunakan menu Wallet untuk top up dan cek riwayat.</p>
            </details>
            <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <summary className="cursor-pointer font-semibold">Di mana melihat syarat dan privasi?</summary>
              <p className="mt-2">Lihat bagian footer halaman ini pada bagian Syarat &amp; Ketentuan dan Kebijakan Privasi.</p>
            </details>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2" id="terms">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Syarat &amp; Ketentuan</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Pengguna wajib memakai akun pribadi, menjaga keamanan akses, dan mematuhi alur transaksi yang berlaku di sistem.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="privacy">
            <h2 className="text-lg font-semibold">Kebijakan Privasi</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Data profil dan transaksi hanya digunakan untuk operasional platform, verifikasi akun, serta kebutuhan audit internal proyek.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
