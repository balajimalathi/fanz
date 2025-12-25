import "./globals.css";


import { Gabarito, Instrument_Sans, Instrument_Serif, Libre_Baskerville } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";
import { Toaster } from "react-hot-toast";



import type { Metadata } from "next";
import Metrics from "./(metrics)";

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
  title: "Chat2Base - AI Assistant to Database in One Click",
  description: siteConfig.site_description,
  metadataBase: new URL(siteConfig.site_domain),
  alternates: {
    canonical: "/",
  },
  keywords: ["AI Assistant", "data extraction", "Airtable", "Google Sheets", "Notion", "productivity", "browser extension"],
  openGraph: {
    title: "Chat2Base - AI Assistant to Database in One Click",
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
    <html lang="en" suppressHydrationWarning className={cn(gabarito.variable, baskerville.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Chat2Base",
              applicationCategory: "Productivity",
              operatingSystem: "Browser Extension",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "Chat2Base",
                url: "https://chat2base.com",
              },
            }),
          }}
        />
        <Metrics />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased ")}>
        <Metrics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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