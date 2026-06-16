/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Указываем что все API routes динамические —
  // Next.js не будет пытаться выполнить их при сборке
  // и не упадёт из-за отсутствующих env переменных
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdfmake'],
  },

  async headers() {
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '*';
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: origin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
