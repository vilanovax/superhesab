import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { DeferredPwaRuntime } from "@/components/pwa/deferred-pwa-runtime";
import "./globals.css";

/**
 * Vazir FD-WOL — two files only for faster LCP.
 * font-medium (500) → Regular; font-semibold (600) → Bold.
 */
const vazir = localFont({
  src: [
    {
      path: "../public/fonts/Vazir-Bold-FD-WOL.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-Bold-FD-WOL.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-Bold-FD-WOL.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-FD-WOL.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Vazir-FD-WOL.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  /**
   * optional: LCP can paint with fallback immediately and not wait for woff2
   * on slow networks (Core Web Vitals guidance for text LCP).
   */
  display: "optional",
  adjustFontFallback: "Arial",
  fallback: ["Tahoma", "Arial", "sans-serif"],
  preload: true,
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
      <head>
        {/*
          Apply persisted theme/accent before paint to avoid a flash of the
          default ocean/light tokens (rendering-hydration-no-flicker).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem("superhesab-app-settings");if(!r)return;var j=JSON.parse(r);var s=j&&j.state?j.state:j;if(!s)return;var t=s.theme||"light";var a=s.accent||"ocean";var resolved=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.accent=a;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <div className="app-shell flex min-h-full flex-1 flex-col">
          <ThemeProvider>{children}</ThemeProvider>
        </div>
        <DeferredPwaRuntime />
      </body>
    </html>
  );
}
