import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prachomat – Fakturace",
  description: "Jednoduchá správa faktur, účtenek a DPH.",
  applicationName: "Prachomat",
  appleWebApp: {
    capable: true,
    title: "Prachomat",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Nastaví dark třídu před renderem — bez bliknutí */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="h-full flex bg-background">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
