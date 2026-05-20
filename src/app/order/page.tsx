"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderDashboard } from "@/components/order/order-dashboard";
import { isSessionAuthenticated, readSession } from "@/lib/client-session";

export default function OrderPage() {
  const router = useRouter();
  const isAuthenticated = isSessionAuthenticated(readSession());

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login?next=/order");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Fitur order perlu login terlebih dahulu. Lanjut ke{" "}
          <Link href="/login?next=/order" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  return <OrderDashboard initialView="checkout" />;
}

