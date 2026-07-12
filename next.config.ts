import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: "/product/:id", destination: "/store/item/:id", permanent: true },
      { source: "/music/library", destination: "/library/music", permanent: true },
      { source: "/music/library/:id", destination: "/library/music/:id", permanent: true },
      { source: "/books/library", destination: "/library/books", permanent: true },
      { source: "/books/library/:id", destination: "/library/books/:id", permanent: true },
      { source: "/assets/library", destination: "/library/assets", permanent: true },
      { source: "/assets/library/:id", destination: "/library/assets/:id", permanent: true },
      {
        source: "/dashboard/:path*",
        destination: "/studio/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
