import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://placeholder:placeholder@placeholder/placeholder',
  },
};

export default nextConfig;
