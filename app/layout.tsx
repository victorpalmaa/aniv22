import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fontes variáveis self-hosted (OFL, via Fontsource): sem request ao Google no in-app do WhatsApp
// e build sem depender de rede. Bodoni Moda com eixo opsz, como no protótipo.
const bodoni = localFont({
  src: [
    { path: './fonts/bodoni-moda-latin-opsz-normal.woff2', weight: '400 900', style: 'normal' },
    { path: './fonts/bodoni-moda-latin-opsz-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--font-bodoni',
  display: 'swap',
  fallback: ['Didot', 'Bodoni 72', 'Georgia', 'serif'],
});
const jost = localFont({
  src: [{ path: './fonts/jost-latin-wght-normal.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-jost',
  display: 'swap',
  fallback: ['Futura', 'Avenir Next', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Parme & Gala',
  description: 'Victor convida: sexta, 15 de janeiro de 2027, às 20h. Traje de gala.',
  metadataBase: new URL('https://parme.recantocolonial.com.br'),
  openGraph: {
    title: 'Parme & Gala',
    description: 'Sexta, 15.01.2027, 20h. Confirme até 05/01.',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: false, follow: false }, // festa privada: fora dos buscadores
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0c0a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bodoni.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
