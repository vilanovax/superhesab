import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
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
    { media: "(prefers-color-scheme: light)", color: "#0f5c57" },
    { media: "(prefers-color-scheme: dark)", color: "#2a9d8f" },
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
      className={`${vazirmatn.variable} ${vazirmatn.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <div className="app-shell flex min-h-full flex-1 flex-col">
          <ThemeProvider>{children}</ThemeProvider>
        </div>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
