"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { LayoutDashboard, Users, FileText, Settings, BarChart2, Sun, Moon, Zap, Receipt, Menu, X, BookOpen, LogOut, Clock, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Přehled", icon: LayoutDashboard },
  { href: "/invoices", label: "Faktury", icon: FileText },
  { href: "/clients", label: "Odběratelé", icon: Users },
  { href: "/templates", label: "Šablony", icon: Zap },
  { href: "/receipts", label: "Účtenky", icon: Receipt },
  { href: "/documents", label: "Dokumenty", icon: FolderArchive },
  { href: "/reports", label: "Výkazy", icon: BarChart2 },
  { href: "/activity", label: "Historie", icon: Clock },
  { href: "/settings", label: "Nastavení", icon: Settings },
  { href: "/docs", label: "Dokumentace", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setAuthEnabled(Boolean(d.enabled)))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobilní hlavička */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-border/60 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Prachomat</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobilní overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop sticky, mobile drawer */}
      <aside
        className={cn(
          "bg-sidebar border-r border-border/60 flex flex-col shrink-0 z-50 transition-transform duration-200",
          // desktop
          "md:w-60 md:h-screen md:sticky md:top-0 md:translate-x-0",
          // mobile
          "fixed top-0 left-0 bottom-0 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 hidden md:block">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Prachomat
            </span>
          </div>
        </div>

        {/* Mobile top spacing */}
        <div className="h-14 md:hidden" />

        {/* Search */}
        <div className="px-3 pb-3">
          <GlobalSearch />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border/60 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide uppercase">
            v0.1
          </p>
          <div className="flex items-center gap-1">
            {authEnabled && (
              <button
                onClick={handleLogout}
                title="Odhlásit"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            <button
              suppressHydrationWarning
              onClick={toggle}
              title={isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
