import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * L'optimiseur d'images Next.js refuse par défaut les qualités hors de sa
   * liste autorisée (400 sur q=85 → placeholder à la place de la photo).
   * On autorise explicitement les qualités utilisées par AssetImage.
   */
  images: {
    qualities: [75, 80, 85, 100],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/boutique/:slug",
        destination: "/b/:slug",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/vendeur",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
