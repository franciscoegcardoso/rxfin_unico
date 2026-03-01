import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kneaniaifzgqibpajyji.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // URLs legadas do Lovable → Next.js
      { source: '/dashboard', destination: '/inicio', permanent: true },
      { source: '/contas', destination: '/lancamentos', permanent: true },
      { source: '/fluxo-financeiro', destination: '/lancamentos', permanent: true },
      { source: '/metas-mensais', destination: '/planejamento/metas', permanent: true },
      { source: '/planos', destination: '/financeiro/planos', permanent: true },
      { source: '/historico-pagamentos', destination: '/financeiro/pagamentos', permanent: true },
      { source: '/minhas-indicacoes', destination: '/financeiro/minhas-indicacoes', permanent: true },
      { source: '/configuracoes', destination: '/minha-conta', permanent: true },
      { source: '/perfil', destination: '/minha-conta', permanent: true },
      { source: '/balanco-patrimonial', destination: '/bens-investimentos/consolidado', permanent: true },
      { source: '/econograph', destination: '/simuladores/planejamento/econograph', permanent: true },
      { source: '/simulador-fipe', destination: '/simuladores/veiculos/simulador-fipe', permanent: true },
      { source: '/simulador-carro-ab', destination: '/simuladores/veiculos/simulador-carro-ab', permanent: true },
      { source: '/simulador-financiamento', destination: '/simuladores/dividas/financiamento-consorcio', permanent: true },
      { source: '/simulador-custo-hora', destination: '/simuladores/planejamento/simulador-custo-hora', permanent: true },
      // Redirects de seção (não permanent — pode mudar)
      { source: '/simuladores', destination: '/simuladores/veiculos', permanent: false },
      { source: '/bens-investimentos', destination: '/bens-investimentos/consolidado', permanent: false },
      { source: '/planejamento', destination: '/planejamento/visao-mensal', permanent: false },
      { source: '/financeiro', destination: '/financeiro/planos', permanent: false },
    ];
  },
};

export default nextConfig;
