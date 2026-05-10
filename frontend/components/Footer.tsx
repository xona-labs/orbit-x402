export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-[13px] text-foreground/55">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="OrbitX402" className="h-5 w-5 rounded-full ring-1 ring-white/10" />
            <span className="font-mono tracking-[0.18em] uppercase text-[11px]">OrbitX402</span>
            <span className="text-foreground/35">·</span>
            <span>Open-source x402 Discovery Layer</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
            <a
              href="https://github.com/xona-labs/orbit-x402"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span className="font-mono text-foreground/35">Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
