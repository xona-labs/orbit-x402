import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'OrbitX402 — x402 Discovery Layer',
  description:
    'Open-source x402 discovery layer for the Solana network. Search servers and paid API resources with natural language for AI agents.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

// Light is default. Apply stored theme before paint to avoid flash.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme') || 'light';
  if (t === 'dark') document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="font-sans antialiased relative bg-background text-foreground"
        style={{ minHeight: '100dvh' }}
      >
        {/* Ambient backdrop — dark mode only */}
        <div aria-hidden className="hidden dark:block fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-ambient animate-ambient" />
          <div
            className="absolute -top-48 left-1/2 -translate-x-1/2 h-[620px] w-[1200px] rounded-full blur-[140px] opacity-70"
            style={{
              background:
                'radial-gradient(closest-side, oklch(1 0 0 / 0.13), oklch(1 0 0 / 0.04) 55%, transparent 80%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(to right, oklch(1 0 0 / 0.55) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.55) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage:
                'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
            }}
          />
          <div className="absolute inset-0 bg-noise" />
          <div
            className="absolute inset-x-0 bottom-0 h-80"
            style={{ background: 'linear-gradient(to top, var(--background), transparent)' }}
          />
        </div>

        {/* Light-mode soft backdrop */}
        <div aria-hidden className="dark:hidden fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-48 left-1/2 -translate-x-1/2 h-[620px] w-[1200px] rounded-full blur-[140px] opacity-70"
            style={{
              background:
                'radial-gradient(closest-side, oklch(0 0 0 / 0.05), oklch(0 0 0 / 0.02) 55%, transparent 80%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(to right, oklch(0 0 0 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, oklch(0 0 0 / 0.4) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage:
                'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
            }}
          />
        </div>

        <Navbar />

        <main className="pt-20">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
