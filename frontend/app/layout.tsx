import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'OrbitX402 — x402 Discovery Layer',
  description: 'Open-source x402 ecosystem explorer for the Solana network. Track facilitators, transfers, and discover x402 resources for agents.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Navbar />

        <main>
          {children}
        </main>

        <footer className="border-t border-white/[0.04] mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-[13px] text-neutral-600">
            <span>OrbitX402</span>
            <span>Open-source x402 Discovery Layer | Solana</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
