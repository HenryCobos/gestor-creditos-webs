import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Evita warning por package-lock.json en carpeta padre (C:\Users\HENRY\)
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Tree-shake de iconos y gráficos — bundles más pequeños al cambiar de ruta
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
