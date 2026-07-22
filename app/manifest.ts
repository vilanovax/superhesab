import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SuperHesab",
    short_name: "SuperHesab",
    description:
      "حساب‌وکتاب اشتراکی — سفر، حساب مشترک و تسویه آسان",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#e8eef1",
    theme_color: "#0f5c57",
    lang: "fa",
    dir: "rtl",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
