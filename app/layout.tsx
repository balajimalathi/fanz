import { Gabarito, Instrument_Sans, Instrument_Serif, Libre_Baskerville } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";
import { PushInit } from "@/components/push/push-init";
import NextTopLoader from 'nextjs-toploader';

import type { Metadata } from "next";
import Metrics from "./(metrics)";

import "./globals.css";

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

const baskerville = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-baskerville",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CreatorX - The platform for creators and global audiences",
  description: siteConfig.site_description,
  metadataBase: new URL(siteConfig.site_domain),
  alternates: {
    canonical: "/",
  },
  keywords: ["CreatorX", "platform for creators", "global audiences", "monetize your content", "subscriptions", "tips", "exclusive content sharing"],
  openGraph: {
    title: "CreatorX - The platform for creators and global audiences",
    description: siteConfig.site_description,
    url: siteConfig.site_domain,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(gabarito.variable, baskerville.variable)} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "CreatorX",
              applicationCategory: "Productivity",
              operatingSystem: "Browser Extension",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "CreatorX",
                url: "https://creatorx.com",
              },
            }),
          }}
        />
        <Metrics />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased ")}>
        <NextTopLoader showSpinner={false} color="#1447e6" />
        <Metrics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PushInit />
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              success: {
                iconTheme: {
                  primary: "hsl(142.1 76.2% 36.3%)",
                  secondary: "white",
                },
              },
              error: {
                iconTheme: {
                  primary: "hsl(0 84.2% 60.2%)",
                  secondary: "white",
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}