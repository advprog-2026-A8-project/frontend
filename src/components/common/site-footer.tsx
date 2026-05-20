import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">JSON</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            JaStip Online Nasional membantu Titiper berbelanja lintas negara lewat Jastiper terverifikasi.
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Layanan pelanggan: support@json.local</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Belanja</p>
          <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <Link href="/catalog" className="hover:underline">Catalog</Link>
            <Link href="/order" className="hover:underline">Order</Link>
            <Link href="/vouchers" className="hover:underline">Voucher</Link>
            <Link href="/wallet" className="hover:underline">Wallet</Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Akun</p>
          <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/register" className="hover:underline">Register</Link>
            <Link href="/profile" className="hover:underline">Profil Saya</Link>
            <Link href="/jastiper" className="hover:underline">Pusat Jastiper</Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Bantuan</p>
          <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <Link href="/help#checkout" className="hover:underline">Cara Checkout</Link>
            <Link href="/help#refund" className="hover:underline">Kebijakan Refund</Link>
            <Link href="/help#security" className="hover:underline">Keamanan Transaksi</Link>
            <Link href="/help#kyc" className="hover:underline">KYC dan Verifikasi Akun</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-slate-400">
          <p>© {year} JaStip Online Nasional. All rights reserved.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/help#terms" className="hover:underline">Syarat & Ketentuan</Link>
            <Link href="/help#privacy" className="hover:underline">Kebijakan Privasi</Link>
            <Link href="/help" className="hover:underline">Pusat Bantuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
