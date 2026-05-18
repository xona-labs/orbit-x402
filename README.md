# OrbitX402

**Open-source discovery layer for x402 paid API resources on Solana.**

OrbitX402 indexes x402-enabled servers, probes their endpoints, and provides LLM-powered natural language search over the resource catalog — so AI agents can find and consume the exact paid API they need without manual configuration.

> Think DNS + Google for the agent economy: a single, queryable index of every paid API an autonomous agent can pay-and-call.

## Thesis

The next phase of the internet is **machine-payable**. Agents need to spend money to get work done — call premium models, fetch data, generate media — and `x402` makes that possible at the protocol level: a cleared HTTP 402 plus a USDC payment header is all an agent needs to consume a service.

But protocol-level payment isn't enough. Two real bottlenecks remain:

1. **Discovery is broken.** An agent given a goal ("find me cheapest image generation on Solana") has no way to know what's out there. Servers are scattered, schemas are inconsistent, prices are hidden until you hit `402`. Hard-coded URLs don't scale across thousands of providers.
2. **Integration is manual.** Today, every team writing an agent re-implements server lookup, endpoint parsing, pricing logic. That's the wrong layer for that work.

**OrbitX402's bet:** the agent economy needs a public, neutral, LLM-readable index of every paid API resource — addressable through a single endpoint and a one-paste `skill.md`. We index servers from `x402scan`, probe each one's `/.well-known/x402` for live pricing, and let any agent ask in natural language. Add the skill, ship the agent, get paid. That's the loop.

We're building the discovery primitive so the rest of the stack (agents, wallets, models) can ride on top.

## How It Works

```
Agent: "find cheapest image generation on Solana"
  |
  v
OrbitX402 API (POST /api/discover)
  |
  v
LLM ranks resources across 58+ servers by relevance, price, and activity
  |
  v
Returns: matching endpoints, pricing, server, pay-to address
  |
  v
Agent calls the x402 endpoint with USDC payment
```

## Features

- **Resource Catalog** — every x402 endpoint discovered across the network, with method, description, and real pricing from 402 responses
- **LLM Discovery** — natural language search ranks resources by relevance for any agent query
- **Server Index** — auto-synced from x402scan.com with transaction stats and volume data
- **Endpoint Probing** — pulls resources from each server's `/.well-known/x402`
- **Skill MD** — drop-in agent skill file, add to any agent's system prompt in one step
- **Server Registration** — external servers can self-register via API
- **CDN-backed** — JSON data synced to DigitalOcean Spaces, backend reads from CDN with in-memory cache

## Quick Start

```bash
# Clone
git clone https://github.com/xona-labs/orbit-x402.git
cd orbitx402

# Configure
cp .env.example .env
# Edit .env with your keys

# Install & run
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start backend (port 3088)
cd backend && node server.js

# Start frontend (port 3089) in another terminal
cd frontend && npm run dev
```

Or with Docker:

```bash
cp .env.example .env
# Edit .env

docker compose up -d
```

## Agent Integration

Add OrbitX402 discovery to any agent in one step:

```bash
# Fetch the skill instructions
curl https://api.orbitx402.com/skill.md
```

Add the content to your agent's system prompt. The agent can now:

```
"find blockchain analytics APIs on Solana"
"what's the cheapest LLM inference available?"
"search for email sending services via x402"
```

## API

### Discovery

```bash
# LLM-powered search
curl -X POST /api/discover \
  -H "Content-Type: application/json" \
  -d '{"query": "find image generation APIs"}'

# Get skill instructions
curl /skill.md
```

### Servers

```bash
# List servers (Solana)
curl /api/servers?chain=solana

# Search servers
curl "/api/servers?search=analytics"

# Server detail + endpoints
curl /api/servers/detail?url=https://api.nansen.ai

# Register your server
curl -X POST /api/servers/register \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-server.com"}'
```

### Resources

```bash
# List all endpoints
curl /api/resources

# Search the catalog
curl "/api/resources?search=image+generation"

# Filter by HTTP method
curl /api/resources?method=POST

# Filter by server
curl /api/resources?server=https://api.nansen.ai
```

Full documentation at `/docs`.

## Architecture

```
orbitx402/
├── backend/                    Express.js API (port 3088)
│   ├── services/
│   │   ├── discovery.service   x402scan sync + endpoint probing
│   │   ├── llm-discovery       LLM-powered search
│   │   └── data.service        JSON read/write + CDN cache
│   ├── routes/                 API endpoints
│   ├── jobs/                   Cron sync (servers + CDN upload)
│   ├── scripts/                Standalone sync + CDN upload
│   ├── data/                   JSON data files
│   └── skill.md                Agent skill instructions
│
├── frontend/                   Next.js app (port 3089)
│   ├── app/                    Pages (dashboard, servers, detail, docs)
│   └── components/             UI components
│
├── docker-compose.yml
└── .env.example
```

### Data Flow

```
x402scan.com ────> servers.json
Server probes ───> resources.json (endpoints + pricing from 402 responses)
                        |
                        v
                  CDN (DO Spaces) <── cron job every 30 min
                        |
                        v
                  Backend API ───> Frontend
                        |
                        v
                  LLM Discovery
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Backend port (default: 3088) |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (default: public mainnet) |
| `SYNC_INTERVAL_MINUTES` | No | Cron sync interval (default: 30) |
| `GEMINI_API_KEY` | No | API key for the LLM provider used by discovery search (falls back to keyword search if missing) |
| `CDN_BASE_URL` | No | CDN URL for reading JSON data |
| `DO_SPACES_KEY` | No | DigitalOcean Spaces access key (enables CDN upload) |
| `DO_SPACES_SECRET` | No | DigitalOcean Spaces secret key |
| `DO_SPACES_BUCKET` | No | Spaces bucket name |
| `DO_SPACES_REGION` | No | Spaces region |
| `DO_SPACES_PREFIX` | No | Key prefix for data files |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (default: http://localhost:3088) |

## Built For Hackathon

OrbitX402 was built to make `x402` actually usable at the agent layer. Concretely:

- **One-paste integration** — `curl /skill.md` → drop into a system prompt → your agent can now discover and call paid APIs.
- **Live network coverage** — sync from `x402scan` + automatic `/.well-known/x402` probing means new providers show up without manual curation.
- **No lock-in** — the index, the API, and the frontend are open-source (MIT). Self-host the whole thing in `docker compose up -d`.
- **LLM-native ranking** — an LLM reads the catalog and ranks by relevance, with a deterministic keyword fallback so the system stays useful without an API key.

What we'd build next given more time: paid-call telemetry to surface "actually working" endpoints, on-chain reputation per server, agent-side SDKs for Python and TypeScript, and a marketplace incentive for providers to keep their `/.well-known/x402` accurate.

## License

MIT — use it, fork it, ship something.
