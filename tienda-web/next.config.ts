import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.100.179'],
};

export default nextConfig;

// Inicializa los enlaces de Cloudflare durante el desarrollo local.
import("@opennextjs/cloudflare").then((module) =>
  module.initOpenNextCloudflareForDev()
);
