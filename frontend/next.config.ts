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
};

export default nextConfig;
