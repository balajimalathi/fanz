import { NextRequest, NextResponse } from "next/server"
import { env } from "@/env"

/**
 * Proxy API route for HLS files to bypass CORS issues
 * Usage: /api/hls-proxy?url=<encoded-url>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      )
    }

    // Decode the URL
    let decodedUrl: string
    try {
      decodedUrl = decodeURIComponent(url)
    } catch {
      decodedUrl = url
    }

    // Validate that the URL is from the R2 bucket
    const r2PublicUrl = env.CLOUDFLARE_R2_PUBLIC_URL
    if (!r2PublicUrl) {
      return NextResponse.json(
        { error: "R2 configuration not found" },
        { status: 500 }
      )
    }

    const r2Hostname = new URL(r2PublicUrl).hostname
    const requestUrl = new URL(decodedUrl)

    // Security: Only allow proxying from the configured R2 bucket
    if (requestUrl.hostname !== r2Hostname) {
      return NextResponse.json(
        { error: "Invalid URL hostname" },
        { status: 403 }
      )
    }

    // Fetch the file from R2
    const response = await fetch(decodedUrl, {
      headers: {
        // Don't forward any auth headers to R2
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the content type from the response or infer from URL
    let contentType = response.headers.get("content-type")
    if (!contentType) {
      if (decodedUrl.endsWith(".m3u8")) {
        contentType = "application/vnd.apple.mpegurl"
      } else if (decodedUrl.endsWith(".ts")) {
        contentType = "video/mp2t"
      } else {
        contentType = "application/octet-stream"
      }
    }

    // Get the content
    const arrayBuffer = await response.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    // If it's an HLS manifest (.m3u8), rewrite URLs to use proxy
    if (decodedUrl.endsWith(".m3u8") || contentType.includes("mpegurl")) {
      const manifestText = buffer.toString("utf-8")
      const baseUrl = new URL(decodedUrl)
      
      // Rewrite URLs in the manifest to use proxy
      const rewrittenManifest = manifestText
        .split("\n")
        .map((line) => {
          // Skip comments and empty lines
          if (line.startsWith("#") || !line.trim()) {
            return line
          }
          
          // If it's a URL line, rewrite it to use proxy
          if (line.trim() && !line.startsWith("#")) {
            try {
              // Handle relative URLs
              const absoluteUrl = line.startsWith("http")
                ? line.trim()
                : new URL(line.trim(), baseUrl).toString()
              
              // Only proxy R2 URLs
              if (absoluteUrl.includes(r2Hostname)) {
                const proxyUrl = `/api/hls-proxy?url=${encodeURIComponent(absoluteUrl)}`
                return proxyUrl
              }
              return line
            } catch {
              // If URL parsing fails, return original line
              return line
            }
          }
          
          return line
        })
        .join("\n")
      
      buffer = Buffer.from(rewrittenManifest, "utf-8")
    }

    // Return with proper CORS headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range",
        "Cache-Control": "public, max-age=3600",
        // Support range requests for video streaming
        "Accept-Ranges": "bytes",
      },
    })
  } catch (error: any) {
    console.error("HLS proxy error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  })
}
