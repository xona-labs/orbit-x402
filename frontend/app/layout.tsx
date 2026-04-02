import type { Metadata } from 'next';
import './globals.css';

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
        {/* Nav */}
        <nav className="glass-panel sticky top-0 z-50 border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="OrbitX402" className="w-7 h-7 rounded-lg" />
              <span className="text-[15px] font-semibold text-white">OrbitX402</span>
            </a>
            <div className="flex items-center gap-1">
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/facilitators', label: 'Facilitators' },
                { href: '/servers', label: 'Servers' },
                { href: '/transfers', label: 'Transactions' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="w-px h-4 bg-white/[0.06] mx-2" />
              {/* Docs icon */}
              <a
                href="/docs"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.04] transition-all"
                title="API Docs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {/* GitHub icon */}
              <a
                href="https://github.com/anthropics/orbitx402"
                target="_blank"
                rel="noopener"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.04] transition-all"
                title="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>
        </nav>

        <main>
          {children}
        </main>

        {/* Footer */}
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
