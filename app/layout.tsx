import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import "./globals.css";

/** Vazir FD-WOL (Farsi digits) — self-hosted from public/fonts */
const vazir = localFont({
  src: [
    {
      path: "../public/fonts/Vazir-Thin-FD-WOL.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-Light-FD-WOL.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-FD-WOL.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-Medium-FD-WOL.woff2",
      weight: "500",
      style: "normal",
    },
    // Map Tailwind semibold (600) → Medium
    {
      path: "../public/fonts/Vazir-Medium-FD-WOL.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-Bold-FD-WOL.woff2",
      weight: "700",
      style: "normal",
    },
    // Map Tailwind extrabold (800) → Bold
    {
      path: "../public/fonts/Vazir-Bold-FD-WOL.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "SuperHesab",
    template: "%s · SuperHesab",
  },
  description: "حساب‌وکتاب اشتراکی — سفر، حساب مشترک و تسویه آسان",
  applicationName: "SuperHesab",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SuperHesab",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a5f8a" },
    { media: "(prefers-color-scheme: dark)", color: "#4da3d4" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      data-accent="ocean"
      className={`${vazir.variable} ${vazir.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <div className="app-shell flex min-h-full flex-1 flex-col">
          <ThemeProvider>{children}</ThemeProvider>
        </div>
        <PwaRuntime />
      </body>
    </html>
  );
}
