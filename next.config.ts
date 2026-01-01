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
    middlewareClientMaxBodySize: "500mb",
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
    // Build CSP with R2 bucket support for HLS video playback
    const connectSrc = [
      "'self'",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://www.clarity.ms",
      "https://scripts.clarity.ms",
    ];
    
    const mediaSrc = ["'self'", "blob:", "data:"];
    
    if (r2Hostname) {
      connectSrc.push(`https://${r2Hostname}`);
      mediaSrc.push(`https://${r2Hostname}`);
    }

    // Add LiveKit support - allow HTTPS and WebSocket connections to LiveKit
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (livekitUrl) {
      try {
        const url = new URL(livekitUrl);
        // Add HTTPS connection
        connectSrc.push(`https://${url.host}`);
        // Add WebSocket support (LiveKit uses wss://)
        connectSrc.push(`wss://${url.host}`);
      } catch (e) {
        // Invalid URL, skip
      }
    }

    // Add WebSocket support - allow ws:// and wss:// connections to the same origin
    // For tunnel URLs, we need to allow both ws and wss to the tunnel domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
    if (appUrl) {
      try {
        const url = new URL(appUrl);
        const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        connectSrc.push(`${wsProtocol}//${url.host}`);
        // Also allow ws:// for development
        if (url.protocol === "https:") {
          connectSrc.push(`ws://${url.host}`);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    // Allow localhost WebSocket for development
    connectSrc.push("ws://localhost:8080", "wss://localhost:8080");
    
    const cspValue = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'self' https://www.youtube.com",
      `connect-src ${connectSrc.join(" ")}`,
      `media-src ${mediaSrc.join(" ")}`,
    ].join("; ");

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
            value: cspValue,
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
