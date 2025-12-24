import type { NextConfig } from "next";
import { withContentlayer } from "next-contentlayer2";

const wordpressHostname = process.env.WORDPRESS_HOSTNAME;
const wordpressUrl = process.env.WORDPRESS_URL;
const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

// Extract hostname from R2 public URL
const r2Hostname = r2PublicUrl ? new URL(r2PublicUrl).hostname : null;

// Build remote patterns array
const remotePatterns: Array<{
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
}> = [];

if (wordpressHostname) {
  remotePatterns.push(
    {
      protocol: "https",
      hostname: wordpressHostname,
      port: "",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "65.109.132.224",
      port: "8081",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      pathname: "/**",
    }
  );
}

if (r2Hostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: r2Hostname,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {},
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns,
  },
  async redirects() {
    if (!wordpressUrl) {
      return [];
    }
    return [
      {
        source: "/admin",
        destination: `${wordpressUrl}/wp-admin`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'self' https://www.youtube.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms;",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default withContentlayer(nextConfig);
