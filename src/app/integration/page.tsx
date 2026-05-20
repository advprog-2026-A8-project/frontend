"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IntegrationWorkspace } from "@/components/integration/integration-workspace";
import { isSessionAuthenticated, readSession } from "@/lib/client-session";

export default function IntegrationPage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const integrationEnabled = process.env.NEXT_PUBLIC_ENABLE_INTEGRATION_WORKSPACE === "true";
  const isAuthenticated = isSessionAuthenticated(session);
  const isAdmin = session.role.toUpperCase().includes("ADMIN");

  useEffect(() => {
    if (!integrationEnabled) {
      router.replace("/");
      return;
    }
    if (!isAuthenticated) {
      router.replace("/login?next=/integration");
      return;
    }
    if (!isAdmin) {
      router.replace("/profile");
    }
  }, [integrationEnabled, isAuthenticated, isAdmin, router]);

  if (!integrationEnabled) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-sm text-slate-700 shadow-sm">
          Halaman ini nonaktif pada mode publik.
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Workspace integrasi memerlukan login admin. Lanjut ke{" "}
          <Link href="/login?next=/integration" className="font-semibold text-slate-600 hover:underline dark:text-slate-300">
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
        <section className="rounded-2xl border border-slate-300 bg-slate-100 p-6 text-sm text-slate-700 shadow-sm">
          Workspace integrasi hanya untuk admin internal tim pengembang.
        </section>
      </main>
    );
  }

  return <IntegrationWorkspace />;
}

