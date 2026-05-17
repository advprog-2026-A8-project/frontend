import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold">JaStip Online Nasional</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Platform jasa titip nasional untuk alur belanja lintas peran: Titiper, Jastiper, dan Admin.
          </p>
        </div>
        <div>
          <p className="font-semibold">Explore</p>
          <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <Link href="/catalog" className="hover:underline">Catalog</Link>
            <Link href="/order" className="hover:underline">Order</Link>
            <Link href="/vouchers" className="hover:underline">Voucher</Link>
            <Link href="/wallet" className="hover:underline">Wallet</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Akses</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Halaman admin dan jastiper hanya muncul sesuai role akun.</p>
        </div>
      </div>
    </footer>
  );
}
