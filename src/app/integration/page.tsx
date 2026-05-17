"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IntegrationWorkspace } from "@/components/integration/integration-workspace";
import { readSession } from "@/lib/client-session";

export default function IntegrationPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const isAuthenticated = Boolean(session.token);
  const isAdmin = session.role.toUpperCase().includes("ADMIN");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/integration");
      return;
    }
    if (!isAdmin) {
      router.replace("/profile");
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Workspace integrasi memerlukan login admin. Lanjut ke{" "}
          <Link href="/login?next=/integration" className="font-semibold text-orange-600 hover:underline dark:text-orange-300">
            halaman login
          </Link>
          .
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          Workspace integrasi hanya untuk admin internal tim pengembang.
        </section>
      </main>
    );
  }

  return <IntegrationWorkspace />;
}
