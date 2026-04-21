import type { MetadataRoute } from "next";

// Next.js zvládá ikony automaticky z app/icon.tsx — v manifest je stačí odkázat.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prachomat",
    short_name: "Prachomat",
    description: "Jednoduchá správa faktur, účtenek a DPH.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    lang: "cs-CZ",
    orientation: "any",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
