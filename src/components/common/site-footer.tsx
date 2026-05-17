import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold">JaStip Online Nasional</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Platform jasa titip untuk barang limited dengan flow transaksi terstruktur.
          </p>
        </div>
        <div>
          <p className="font-semibold">Explore</p>
          <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            <Link href="/catalog" className="hover:underline">Catalog</Link>
            <Link href="/order" className="hover:underline">Order</Link>
            <Link href="/vouchers" className="hover:underline">Voucher</Link>
            <Link href="/integration" className="hover:underline">Integration Workspace</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Flow</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">feature -&gt; staging -&gt; main</p>
        </div>
      </div>
    </footer>
  );
}
