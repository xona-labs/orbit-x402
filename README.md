# OrbitX402

Open-source discovery layer for x402 paid API resources on Solana.

OrbitX402 indexes x402-enabled servers, tracks USDC transactions through payment facilitators, and provides LLM-powered natural language search — so AI agents can find and consume paid APIs without manual configuration.

## How It Works

```
Agent: "find cheapest image generation on Solana"
  |
  v
OrbitX402 API (POST /api/discover)
  |
  v
LLM ranks 58+ servers by relevance, price, and activity
  |
  v
Returns: server, endpoints, pricing, pay-to address
  |
  v
Agent calls the x402 endpoint with USDC payment
```

## Features

- **LLM Discovery** — natural language search across all indexed x402 servers and endpoints
- **Server Index** — auto-synced from x402scan.com with transaction stats and volume data
- **Endpoint Probing** — discovers resources from each server's `/.well-known/x402` with real pricing from 402 responses
- **Transfer Scanner** — tracks USDC transfers through facilitator wallets (PayAI, Dexter, Relai) via Solana RPC
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

# Filter by server
curl /api/resources?server=https://api.nansen.ai
```

### Facilitators & Transactions

```bash
curl /api/facilitators
curl /api/transfers?facilitator=dexter&limit=20
curl /api/stats?period=24h
```

Full documentation at `/docs`.

## Architecture

```
orbitx402/
├── backend/                    Express.js API (port 3088)
│   ├── services/
│   │   ├── scanner.service     Solana RPC transfer scanner
│   │   ├── discovery.service   x402scan sync + endpoint probing
│   │   ├── llm-discovery       Gemini-powered search
│   │   └── data.service        JSON read/write + CDN cache
│   ├── routes/                 API endpoints
│   ├── jobs/                   Cron sync (transfers + servers + CDN upload)
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
Solana RPC ──────> transfers.json ──> facilitator stats
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
                  LLM Discovery (Gemini Flash)
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Backend port (default: 3088) |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (default: public mainnet) |
| `SYNC_INTERVAL_MINUTES` | No | Cron sync interval (default: 30) |
| `GEMINI_API_KEY` | No | Enables LLM discovery search (falls back to keyword search) |
| `CDN_BASE_URL` | No | CDN URL for reading JSON data |
| `DO_SPACES_KEY` | No | DigitalOcean Spaces access key (enables CDN upload) |
| `DO_SPACES_SECRET` | No | DigitalOcean Spaces secret key |
| `DO_SPACES_BUCKET` | No | Spaces bucket name |
| `DO_SPACES_REGION` | No | Spaces region |
| `DO_SPACES_PREFIX` | No | Key prefix for data files |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (default: http://localhost:3088) |

## Facilitators Tracked

| Facilitator | Solana Addresses | Color |
|---|---|---|
| **PayAI** | 3 addresses | Purple |
| **Dexter** | 1 address | Orange |
| **Relai** | 1 address | Violet |

## License

MIT
