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
  { href: "/jastiper", label: "Jastiper" },
  { href: "/admin", label: "Admin" },
  { href: "/integration", label: "Integration" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const protectedRoutes = new Set(["/order", "/wallet", "/profile", "/jastiper", "/admin", "/integration"]);

  function handleProtectedNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!protectedRoutes.has(href)) return;
    const session = readSession();
    if (session.token) return;
    event.preventDefault();
    router.push(`/login?next=${encodeURIComponent(href)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 px-2 py-1 text-xs font-bold text-white">
              JSON
            </span>
            <span className="text-sm font-semibold">JaStip Online Nasional</span>
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            <DarkModeToggle />
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Login
            </Link>
          </div>

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
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleProtectedNavigation(event, item.href)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-xs transition",
                pathname === item.href
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/register"
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700"
          >
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}
