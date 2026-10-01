import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sequelize loads dialect dependencies dynamically through Node.js.
  serverExternalPackages: ["sequelize"],
};

export default nextConfig;
