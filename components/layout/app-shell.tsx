"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = pathname === "/login" || pathname.startsWith("/public/");

  if (hideShell) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="py-6 px-4 md:py-10 md:px-10">
          {children}
        </div>
      </main>
    </ToastProvider>
  );
}
