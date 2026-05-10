'use client';

import { useEffect, useState } from 'react';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/servers', label: 'Servers' },
  { href: '/docs', label: 'Docs' },
  { href: 'https://github.com/xona-labs/orbit-x402', label: 'GitHub', external: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [path, setPath] = useState('/');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPath(window.location.pathname);
      const stored = (localStorage.getItem('theme') as 'light' | 'dark' | null) || 'light';
      setTheme(stored);
    }
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-40 transition-all duration-500',
        scrolled ? 'py-3' : 'py-5',
      )}
    >
      <div className="relative flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: mobile trigger + wordmark */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden rounded-full border border-border bg-background/60 backdrop-blur-md p-2 hover:bg-foreground/[0.06] transition-all text-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path d="M3.75 9h16.5m-16.5 6.75h16.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <a href="/" className="hidden lg:flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="OrbitX402"
              className="h-7 w-7 rounded-full ring-1 ring-foreground/10 transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <div className="leading-none flex items-baseline gap-2">
              <span className="text-[14px] font-semibold tracking-[0.12em] text-foreground">ORBITX402</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/45">/ discovery</span>
            </div>
          </a>
        </div>

        {/* Center: floating pill nav */}
        <nav
          className={cn(
            'hidden lg:flex items-center gap-0.5 rounded-full border px-1.5 py-1 transition-all duration-500',
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            scrolled
              ? 'border-border bg-background/70 backdrop-blur-xl shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04),0_12px_32px_-14px_oklch(0_0_0/0.18)]'
              : 'border-border/70 bg-background/40 backdrop-blur-md shadow-[inset_0_1px_0_0_oklch(1_0_0/0.03)]',
          )}
        >
          {links.map(link => {
            const active = !link.external && path === link.href;
            const className = cn(
              'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight transition-colors',
              active ? 'text-foreground' : 'text-foreground/55 hover:text-foreground',
            );
            const inner = (
              <>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-foreground/[0.08] border border-foreground/[0.08] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)]"
                  />
                )}
                <span className="relative">{link.label}</span>
              </>
            );
            if (link.external) {
              return (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                  {inner}
                </a>
              );
            }
            return (
              <a key={link.href} href={link.href} className={className}>
                {inner}
              </a>
            );
          })}
        </nav>

        {/* Right: theme toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background/60 backdrop-blur-md text-foreground/60 hover:text-foreground hover:border-foreground/20 hover:bg-foreground/[0.06] transition-all"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              /* Moon icon — click to go dark */
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              /* Sun icon — click to go light */
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden mt-3 mx-4 rounded-2xl border border-border bg-background/90 backdrop-blur-xl p-2 shadow-xl">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block rounded-xl px-3 py-2 text-[14px] transition-colors',
                !link.external && path === link.href
                  ? 'bg-foreground/[0.08] text-foreground'
                  : 'text-foreground/65 hover:bg-foreground/[0.05] hover:text-foreground',
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
