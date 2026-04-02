'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'https://api.orbitx402.com';

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: `OrbitX402 is an open-source x402 discovery layer for AI agents on the Solana network. It indexes x402-enabled servers, tracks USDC transfers through facilitators, and provides LLM-powered natural language search for agents to find and consume paid API resources.`,
  },
  {
    id: 'quickstart',
    title: 'Quick Start',
    content: `Add OrbitX402 discovery to your agent in one step:

Fetch the skill instructions and add them to your agent's system prompt:`,
    code: `curl ${API_BASE}/skill.md`,
    note: 'The skill MD contains instructions, actions, and an OpenAI function-calling schema.',
  },
  {
    id: 'discover',
    title: 'POST /api/discover',
    subtitle: 'LLM-Powered Natural Language Search',
    content: 'Send a natural language query to find relevant x402 servers and resources. Uses Gemini Flash to rank results by relevance.',
    code: `curl -X POST ${API_BASE}/api/discover \\
  -H "Content-Type: application/json" \\
  -d '{"query": "find image generation APIs on Solana"}'`,
    response: `{
  "query": "find image generation APIs on Solana",
  "results": [
    {
      "serverUrl": "https://api.xona-agent.com",
      "title": "Xona Agent | x402 Creative AI Agent",
      "reason": "Offers 61 image generation endpoints...",
      "relevanceScore": 95,
      "server": { "title": "...", "chains": ["solana"], "stats": {...} },
      "resources": [
        { "endpoint": "...", "slug": "image/creative-director", "method": "POST" }
      ]
    }
  ],
  "total": 3,
  "model": "gemini-2.0-flash",
  "fallback": false
}`,
    params: [
      { name: 'query', type: 'string', required: true, desc: 'Natural language search query (max 500 chars)' },
    ],
  },
  {
    id: 'servers-list',
    title: 'GET /api/servers',
    subtitle: 'List x402 Servers',
    content: 'Browse all indexed x402 servers with filtering and pagination.',
    code: `curl "${API_BASE}/api/servers?chain=solana&search=analytics&limit=10"`,
    params: [
      { name: 'chain', type: 'string', required: false, desc: 'Filter by blockchain (solana, base, polygon)' },
      { name: 'facilitator', type: 'string', required: false, desc: 'Filter by facilitator (dexter, payAI, relai)' },
      { name: 'search', type: 'string', required: false, desc: 'Keyword search on title/description/URL' },
      { name: 'page', type: 'number', required: false, desc: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, desc: 'Items per page (default: 50, max: 100)' },
    ],
  },
  {
    id: 'servers-detail',
    title: 'GET /api/servers/detail',
    subtitle: 'Server Detail + Endpoints',
    content: 'Get a single server with all its discovered x402 resources.',
    code: `curl "${API_BASE}/api/servers/detail?url=https://api.nansen.ai"`,
    params: [
      { name: 'url', type: 'string', required: true, desc: 'Server URL (e.g., https://api.nansen.ai)' },
    ],
  },
  {
    id: 'servers-register',
    title: 'POST /api/servers/register',
    subtitle: 'Register Your Server',
    content: `Register a new x402 server to make it discoverable. The system probes your server's /.well-known/x402 discovery document to find endpoints automatically.`,
    code: `curl -X POST ${API_BASE}/api/servers/register \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-server.com"}'`,
    response: `{
  "success": true,
  "server": {
    "serverUrl": "https://your-server.com",
    "title": "",
    "resourceCount": 12
  },
  "message": "Registered with 12 x402 endpoints discovered"
}`,
    params: [
      { name: 'url', type: 'string', required: true, desc: 'Your server URL (must be https)' },
      { name: 'title', type: 'string', required: false, desc: 'Server name' },
      { name: 'description', type: 'string', required: false, desc: 'What your server does' },
    ],
    note: 'Rate limited to 5 registrations per hour per IP. Add a /.well-known/x402 discovery document to your server for automatic endpoint detection.',
  },
  {
    id: 'resources',
    title: 'GET /api/resources',
    subtitle: 'List x402 Endpoints',
    content: 'Browse all discovered x402 endpoints across all servers.',
    code: `curl "${API_BASE}/api/resources?server=https://api.nansen.ai&method=POST"`,
    params: [
      { name: 'server', type: 'string', required: false, desc: 'Filter by server URL' },
      { name: 'method', type: 'string', required: false, desc: 'Filter by HTTP method (GET, POST, etc.)' },
      { name: 'search', type: 'string', required: false, desc: 'Keyword search' },
      { name: 'page', type: 'number', required: false, desc: 'Page number' },
      { name: 'limit', type: 'number', required: false, desc: 'Items per page (max: 200)' },
    ],
  },
  {
    id: 'facilitators',
    title: 'GET /api/facilitators',
    subtitle: 'Payment Facilitators',
    content: 'List x402 payment facilitators tracked on the Solana network (PayAI, Dexter, Relai).',
    code: `curl ${API_BASE}/api/facilitators`,
  },
  {
    id: 'transfers',
    title: 'GET /api/transfers',
    subtitle: 'Transaction History',
    content: 'Paginated USDC transactions through x402 facilitators on Solana.',
    code: `curl "${API_BASE}/api/transfers?facilitator=dexter&limit=20"`,
    params: [
      { name: 'facilitator', type: 'string', required: false, desc: 'Filter by facilitator ID' },
      { name: 'direction', type: 'string', required: false, desc: 'sent or received' },
      { name: 'page', type: 'number', required: false, desc: 'Page number' },
      { name: 'limit', type: 'number', required: false, desc: 'Items per page (max: 200)' },
    ],
  },
  {
    id: 'stats',
    title: 'GET /api/stats',
    subtitle: 'Ecosystem Stats',
    content: 'Aggregated statistics: total volume, transactions, servers, endpoints, daily volume breakdown. Supports period filtering.',
    code: `curl "${API_BASE}/api/stats?period=24h"`,
    params: [
      { name: 'period', type: 'string', required: false, desc: '24h, 7d, 30d, or omit for all time' },
    ],
  },
];

export default function DocsPage() {
  const [activeId, setActiveId] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <span className="section-label">Contents</span>
            <nav className="mt-3 space-y-0.5">
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all ${
                    activeId === s.id
                      ? 'text-white bg-white/[0.06]'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-14">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">API Documentation</h1>
            <p className="text-neutral-400 text-[15px]">
              Everything you need to integrate OrbitX402 discovery into your agent or application.
            </p>
          </div>

          {/* Sections */}
          {sections.map(s => (
            <section key={s.id} id={s.id} className="space-y-4 scroll-mt-24">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {s.title}
                </h2>
                {s.subtitle && (
                  <span className="text-[13px] text-neutral-500">{s.subtitle}</span>
                )}
              </div>

              <p className="text-[14px] text-neutral-400 leading-relaxed whitespace-pre-line">
                {s.content}
              </p>

              {/* Params table */}
              {s.params && (
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="px-4 py-2 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Param</th>
                        <th className="px-4 py-2 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Type</th>
                        <th className="px-4 py-2 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Required</th>
                        <th className="px-4 py-2 text-left text-[11px] text-neutral-500 uppercase tracking-wider font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.params.map((p: any) => (
                        <tr key={p.name} className="border-b border-white/[0.02]">
                          <td className="px-4 py-2 font-mono text-[12px] text-white">{p.name}</td>
                          <td className="px-4 py-2 text-[12px] text-neutral-500">{p.type}</td>
                          <td className="px-4 py-2 text-[12px]">
                            {p.required ? (
                              <span className="text-amber-400">yes</span>
                            ) : (
                              <span className="text-neutral-600">no</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-[12px] text-neutral-400">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Code block */}
              {s.code && (
                <pre className="glass-card p-4 overflow-x-auto text-[12px] font-mono text-neutral-300 leading-relaxed no-scrollbar">
                  {s.code}
                </pre>
              )}

              {/* Response */}
              {s.response && (
                <div>
                  <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Response</span>
                  <pre className="glass-card p-4 mt-2 overflow-x-auto text-[12px] font-mono text-neutral-400 leading-relaxed no-scrollbar">
                    {s.response}
                  </pre>
                </div>
              )}

              {/* Note */}
              {s.note && (
                <div className="glass-card p-3 text-[12px] text-neutral-500 border-l-2 border-neutral-600">
                  {s.note}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
