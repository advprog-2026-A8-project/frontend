"use client";

import Link from "next/link";
import { MouseEvent, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DarkModeToggle } from "@/components/common/darkmode-toggle";
import { clearCheckoutDraft, clearSession, isSessionAuthenticated, readSession } from "@/lib/client-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SessionState } from "@/types/integration";

type NavItem = {
  href: string;
  label: string;
  protected?: boolean;
  adminOnly?: boolean;
  jastiperOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/order", label: "Order", protected: true },
  { href: "/vouchers", label: "Voucher" },
  { href: "/wallet", label: "Wallet", protected: true },
  { href: "/profile", label: "Profile", protected: true },
  { href: "/jastiper", label: "Jastiper", protected: true, jastiperOnly: true },
  { href: "/admin", label: "Admin", protected: true, adminOnly: true },
];
const EMPTY_SESSION: SessionState = { token: "", userId: "", role: "TITIPER" };
const subscribe = () => () => {};
const SESSION_STORAGE_KEY = "json_frontend_session";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const sessionRaw = useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === "undefined") return "";
      return window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    },
    () => ""
  );
  const session = useMemo(() => {
    if (!sessionRaw) return EMPTY_SESSION;
    return readSession();
  }, [sessionRaw, pathname]);
  const role = session.role.toUpperCase();
  const isAuthenticated = isSessionAuthenticated(session);
  const isAdmin = role.includes("ADMIN");
  const isJastiper = role.includes("JASTIPER");

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.jastiperOnly && !(isJastiper || isAdmin)) return false;
    return true;
  });

  function handleNavigationGuard(event: MouseEvent<HTMLAnchorElement>, item: NavItem) {
    if (item.protected && !isAuthenticated) {
      event.preventDefault();
      router.push(`/login?next=${encodeURIComponent(item.href)}`);
      return;
    }

    if (item.adminOnly && !isAdmin) {
      event.preventDefault();
      router.push("/profile");
      return;
    }

    if (item.jastiperOnly && !(isJastiper || isAdmin)) {
      event.preventDefault();
      router.push("/profile");
    }
  }

  function logout() {
    clearCheckoutDraft();
    clearSession();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      <nav className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              JSON
            </span>
            <span className="text-sm font-semibold">JaStip Online Nasional</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavigationGuard(event, item)}
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
            {!isAuthenticated && (
              <>
                <Button asChild variant="outline" className="ml-2">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
            {isAuthenticated && (
              <Button type="button" variant="outline" onClick={logout} className="ml-2">
                Logout
              </Button>
            )}
            <DarkModeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <DarkModeToggle />
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Login
              </Link>
            ) : (
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavigationGuard(event, item)}
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
          {!isAuthenticated && (
            <Link
              href="/register"
              className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700"
            >
              Register
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
