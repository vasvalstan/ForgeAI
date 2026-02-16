/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence tldraw duplicate ESM warnings in dev
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
