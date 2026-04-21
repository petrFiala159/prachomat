import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@react-pdf/renderer",
    "canvas",
  ],
};

export default nextConfig;
