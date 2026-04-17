"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Space_Grotesk, Fraunces } from "next/font/google";
import { DarkModeToggle } from "@/components/common/darkmode-toggle";
import { Button } from "@/components/ui/button";

const display = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const sans = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

type Category = "Sneakers" | "Beauty" | "Snack" | "Concert";

const categories: Record<Category, { city: string; eta: string; fee: number; picks: string[]; trend: string }> = {
  Sneakers: {
    city: "Seoul",
    eta: "5-8 hari",
    fee: 80000,
    picks: ["Raffle pair", "Outlet exclusive", "Retro limited"],
    trend: "High Demand",
  },
  Beauty: {
    city: "Tokyo",
    eta: "4-7 hari",
    fee: 45000,
    picks: ["Sunscreen cult", "Gift box edition", "Drugstore viral"],
    trend: "Fast Moving",
  },
  Snack: {
    city: "Osaka",
    eta: "3-6 hari",
    fee: 35000,
    picks: ["Regional KitKat", "Seasonal mochi", "Limited chips"],
    trend: "Stable",
  },
  Concert: {
    city: "Bangkok",
    eta: "6-10 hari",
    fee: 98000,
    picks: ["Lightstick official", "Tour tee", "Photo card set"],
    trend: "War Zone",
  },
};

const highlights = [
  { title: "Smart Queue", desc: "Checkout traffic dibagi adil saat war barang terbatas." },
  { title: "Status Real-time", desc: "Lacak alur PAID sampai COMPLETED tanpa nebak-nebak." },
  { title: "Refund Ready", desc: "Jika jastiper cancel, dana kembali otomatis ke wallet." },
];

const testimonials = [
  { name: "Mira - Titiper", quote: "Ga perlu titip manual di chat lagi. Semua status jelas dan rapi." },
  { name: "Fikri - Jastiper", quote: "To-do order segmented bantu banget pas lagi banyak pesanan masuk." },
  { name: "Naya - Titiper", quote: "Habis order selesai, langsung rate produk dan jastiper di tempat yang sama." },
];

export function HomeLandingPage() {
  const [active, setActive] = useState<Category>("Sneakers");
  const [qty, setQty] = useState(2);
  const [queue, setQueue] = useState(140);
  const [pulse, setPulse] = useState(0);

  const current = categories[active];

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((value) => (value + 1) % 3);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const estimatedFee = useMemo(() => current.fee * qty, [current.fee, qty]);
  const fairness = useMemo(() => Math.max(77, 97 - Math.floor(queue / 18)), [queue]);

  return (
    <div className={`${sans.className} min-h-screen bg-[linear-gradient(165deg,#fef3c7_0%,#ffedd5_30%,#dbeafe_65%,#ecfeff_100%)] text-slate-900 dark:bg-[linear-gradient(165deg,#0b1120_0%,#111827_35%,#06202a_70%,#1f2937_100%)] dark:text-slate-100`}>
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/60">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 px-2 py-1 text-xs font-bold text-white shadow">JSON</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">JaStip Online Nasional</p>
              <p className="text-sm font-semibold">Titip Barang Limited, Lebih Pasti</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Button type="button" variant="outline" size="sm">Jadi Jastiper</Button>
            <Button type="button" variant="outline" size="sm">Katalog</Button>
            <Button asChild size="sm"><Link href="/order">Mulai Titip</Link></Button>
            <DarkModeToggle />
          </div>

          <div className="md:hidden"><DarkModeToggle /></div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg dark:border-slate-700/70 dark:bg-slate-900/70">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-300/40 blur-2xl" />
            <div className="absolute -bottom-14 right-10 h-36 w-36 rounded-full bg-cyan-300/40 blur-2xl" />
            <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">Live War Engine</p>
            <h1 className={`${display.className} mt-3 text-4xl leading-tight sm:text-5xl`}>
              Barang incaran dari luar kota dan luar negeri, tiba tanpa drama titip manual.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Platform jastip yang menghubungkan Titiper dan Jastiper untuk war barang limited. Modul order sudah aktif: checkout, monitoring status, cancel plus refund, hingga rating akhir.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild><Link href="/order">Titip Sekarang</Link></Button>
              <Button asChild variant="outline"><Link href="/order/list">Tracking Order</Link></Button>
              <Button type="button" variant="outline">Promo Voucher</Button>
            </div>
          </article>

          <article className="rounded-3xl border border-white/60 bg-slate-950 p-5 text-white shadow-lg dark:border-slate-700/70">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Today Spotlight</p>
            <h2 className={`${display.className} mt-2 text-2xl`}>Flash Drop Arena</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className={`rounded-xl border border-white/20 p-3 transition ${pulse === 0 ? "bg-white/20" : "bg-white/10"}`}>
                Seoul Sneaker Release
              </div>
              <div className={`rounded-xl border border-white/20 p-3 transition ${pulse === 1 ? "bg-white/20" : "bg-white/10"}`}>
                Tokyo Beauty Box
              </div>
              <div className={`rounded-xl border border-white/20 p-3 transition ${pulse === 2 ? "bg-white/20" : "bg-white/10"}`}>
                Bangkok Concert Merch
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-300">Batch update otomatis tiap beberapa menit.</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow dark:border-slate-700/70 dark:bg-slate-900/70 lg:col-span-2">
            <h3 className={`${display.className} text-2xl`}>Eksplor Kategori Titipan</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pilih kategori untuk lihat origin, ETA, dan estimasi biaya titip.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(categories) as Category[]).map((item) => (
                <Button key={item} size="sm" variant={active === item ? "default" : "outline"} onClick={() => setActive(item)}>
                  {item}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="text-sm font-semibold">{active}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Origin: {current.city}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">ETA: {current.eta}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">Trend: {current.trend}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {current.picks.map((pick) => (
                    <li key={pick}>{pick}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <label className="text-sm font-medium">Jumlah item: {qty}</label>
                <input type="range" min={1} max={10} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-2 w-full" />
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Estimasi biaya titip</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">Rp {estimatedFee.toLocaleString("id-ID")}</p>
                <Button asChild className="mt-3" size="sm"><Link href="/order">Checkout Kategori Ini</Link></Button>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow dark:border-slate-700/70 dark:bg-slate-900/70">
            <h3 className={`${display.className} text-xl`}>Queue Meter</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Simulasi beban saat war.</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
              <label className="text-sm font-medium">Concurrent checkout: {queue}</label>
              <input type="range" min={60} max={520} step={5} value={queue} onChange={(e) => setQueue(Number(e.target.value))} className="mt-2 w-full" />
              <p className="mt-3 text-xs text-slate-500">Fairness score</p>
              <p className="text-3xl font-bold">{fairness}%</p>
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 dark:border-slate-700/70 dark:bg-slate-900/70">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow dark:border-slate-700/70 dark:bg-slate-900/70">
          <h3 className={`${display.className} text-2xl`}>Cerita Pengguna</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="text-sm italic text-slate-700 dark:text-slate-200">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-3 text-sm font-semibold">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300 bg-[linear-gradient(120deg,#fde68a,#fdba74,#67e8f9)] p-6 text-slate-900 shadow-lg dark:border-amber-500/40 dark:bg-[linear-gradient(120deg,#1e293b,#334155,#0f766e)] dark:text-slate-100">
          <h3 className={`${display.className} text-3xl`}>Siap dapetin barang incaranmu?</h3>
          <p className="mt-2 max-w-2xl text-sm">Masuk ke modul order yang sudah terintegrasi dengan backend, lalu mulai titip dalam beberapa langkah.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link href="/order">Mulai Checkout</Link></Button>
            <Button type="button" variant="outline">Daftar Jastiper</Button>
            <Button type="button" variant="outline">Buka Promo</Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/50 bg-white/70 dark:border-slate-700/70 dark:bg-slate-950/70">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-bold">JaStip Online Nasional</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Platform jastip untuk belanja barang limited yang lebih transparan dan aman.</p>
          </div>
          <div>
            <p className="font-bold">Quick Access</p>
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/order" className="hover:underline">Order Checkout</Link>
              <Link href="/order/list" className="hover:underline">Order Tracking</Link>
              <button type="button" className="text-left text-slate-600 dark:text-slate-300">Katalog (Soon)</button>
            </div>
          </div>
          <div>
            <p className="font-bold">Contact & Support</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Pusat bantuan, dispute handling, dan verifikasi akun akan menyusul sesuai modul.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
