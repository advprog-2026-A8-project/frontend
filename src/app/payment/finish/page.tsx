import Link from "next/link";

type PaymentResultPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "-";
  return value ?? "-";
}

export default function PaymentFinishPage({ searchParams }: PaymentResultPageProps) {
  const params = searchParams ?? {};
  const orderId = readParam(params, "order_id");
  const statusCode = readParam(params, "status_code");
  const transactionStatus = readParam(params, "transaction_status");

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Payment Result</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Pembayaran Berhasil</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Midtrans mengarahkan user ke halaman ini setelah pembayaran selesai.
          </p>

          <div className="mt-5 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/60">
            <p>Order ID: <span className="font-mono">{orderId}</span></p>
            <p>Status Code: <span className="font-mono">{statusCode}</span></p>
            <p>Transaction Status: <span className="font-mono">{transactionStatus}</span></p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/wallet" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              Kembali ke Wallet
            </Link>
            <Link href="/order" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Lihat Order
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}