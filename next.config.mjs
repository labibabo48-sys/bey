import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: [
          path.resolve(__dirname, "node_modules"),
          path.resolve(__dirname, ".next"),
        ],
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

export default nextConfig
