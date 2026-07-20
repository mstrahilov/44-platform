import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: "/studio/products", destination: "/studio", permanent: true },
      { source: "/studio/preferences", destination: "/studio", permanent: true },
      { source: "/studio/settings", destination: "/settings", permanent: true },
      { source: "/browse", destination: "/store", permanent: true },
      { source: "/browse/assets", destination: "/store/sample-packs", permanent: true },
      { source: "/browse/:category", destination: "/store/:category", permanent: true },
      { source: "/browse/item/:identifier", destination: "/store/item/:identifier", permanent: true },
      { source: "/collection", destination: "/library", permanent: true },
      { source: "/collection/assets", destination: "/library/sample-packs", permanent: true },
      { source: "/collection/:category", destination: "/library/:category", permanent: true },
      { source: "/collection/item/:kind/:id", destination: "/library/item/:id", permanent: true },
      { source: "/shop", destination: "/store/merch", permanent: true },
      { source: "/merch", destination: "/store/merch", permanent: true },
      { source: "/merch/store", destination: "/store/merch", permanent: true },
      { source: "/merch/orders", destination: "/settings#account", permanent: false },
      { source: "/music", destination: "/store/music", permanent: true },
      { source: "/music/discover", destination: "/store/music", permanent: true },
      { source: "/music/store", destination: "/store/music", permanent: true },
      { source: "/music/store/:slug", destination: "/store/item/:slug", permanent: true },
      { source: "/music/library", destination: "/library/music", permanent: true },
      { source: "/music/library/:id", destination: "/library/item/:id", permanent: true },
      { source: "/books", destination: "/store/books", permanent: true },
      { source: "/books/discover", destination: "/store/books", permanent: true },
      { source: "/books/store", destination: "/store/books", permanent: true },
      { source: "/books/store/:slug", destination: "/store/item/:slug", permanent: true },
      { source: "/books/library", destination: "/library/books", permanent: true },
      { source: "/books/library/:id", destination: "/library/item/:id", permanent: true },
      { source: "/assets", destination: "/store/sample-packs", permanent: true },
      { source: "/assets/discover", destination: "/store/sample-packs", permanent: true },
      { source: "/assets/store", destination: "/store/sample-packs", permanent: true },
      { source: "/assets/store/:slug", destination: "/store/item/:slug", permanent: true },
      { source: "/assets/library", destination: "/library/sample-packs", permanent: true },
      { source: "/assets/library/:id", destination: "/library/item/:id", permanent: true },
      { source: "/merch/store/:slug", destination: "/store/item/:slug", permanent: true },
      { source: "/library/music/:id", destination: "/library/item/:id", permanent: true },
      { source: "/library/books/:id", destination: "/library/item/:id", permanent: true },
      { source: "/library/assets/:id", destination: "/library/item/:id", permanent: true },
      { source: "/library/item/:kind/:id", destination: "/library/item/:id", permanent: true },
      { source: "/store/:category(music|books|assets|sample-packs|merch|games)/:slug", destination: "/store/item/:slug", permanent: true },
      { source: "/community/following", destination: "/community?filter=following", permanent: false },
      { source: "/community/profile/:username", destination: "/profile/:username", permanent: true },
      { source: "/studio/analytics", destination: "/studio", permanent: false },
      { source: "/product/:id", destination: "/store/item/:id", permanent: true },
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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-src 'self' https://interactive.44os.com https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; form-action 'self'" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
