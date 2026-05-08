"use client";

import Link from "next/link";
import { MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DarkModeToggle } from "@/components/common/darkmode-toggle";
import { cn } from "@/lib/utils";
import { readSession } from "@/lib/client-session";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/order", label: "Order" },
  { href: "/vouchers", label: "Voucher" },
  { href: "/wallet", label: "Wallet" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const protectedRoutes = new Set(["/order", "/wallet", "/profile"]);

  function handleProtectedNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!protectedRoutes.has(href)) return;
    const session = readSession();
    if (session.token) return;
    event.preventDefault();
    router.push(`/login?next=${encodeURIComponent(href)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 px-2 py-1 text-xs font-bold text-white">
            JSON
          </span>
          <span className="text-sm font-semibold">JaStip Online Nasional</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleProtectedNavigation(event, item.href)}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition",
                pathname === item.href
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Register
          </Link>
          <DarkModeToggle />
        </div>
      </nav>
    </header>
  );
}
