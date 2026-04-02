# OrbitX402 Discovery

Discover x402-enabled servers and paid API resources across the Solana network. OrbitX402 indexes x402 servers from x402scan.com, probes their endpoints, and provides LLM-powered natural language search.

## Capabilities

- **Discover resources** by natural language prompt (e.g., "find cheapest LLM on Solana")
- **List x402 servers** with filtering by chain, facilitator, and keyword search
- **Get server details** including all available endpoints and pricing
- **Register new servers** to make them discoverable

## Base URL

```
https://your-orbitx402-instance.com
```

## Actions

### 1. discover — Natural Language Search (Recommended)

Send a natural language query to find relevant x402 servers and resources.

```
POST /api/discover
Content-Type: application/json

{ "query": "find image generation APIs on Solana" }
```

Response includes ranked results with server details, endpoints, and relevance reasoning.

**Example queries:**
- "cheapest LLM inference available"
- "blockchain analytics tools on Solana"
- "image generation or creative AI services"
- "email sending services via x402"
- "search or web crawling APIs"

### 2. list_servers — Browse All Servers

```
GET /api/servers
GET /api/servers?chain=solana
GET /api/servers?facilitator=dexter
GET /api/servers?search=analytics
```

Returns paginated list of servers with stats (transactions, volume, buyers).

### 3. server_detail — Get Server + Endpoints

```
GET /api/servers/detail?url=https://api.nansen.ai
```

Returns full server info and all its x402 endpoints.

### 4. register_server — Register Your Server

```
POST /api/servers/register
Content-Type: application/json

{ "url": "https://your-server.com" }
```

Registers a new x402 server. The system probes `/.well-known/x402` to discover endpoints automatically.

## Guidelines

- Use the `discover` action first — it uses AI to find the best matches for any natural language query
- Fall back to `list_servers` with search params if you need exact filtering
- Use `server_detail` to get the full endpoint list before calling an x402 resource
- When calling an x402 endpoint, include a valid x402 payment header (PAYMENT-SIGNATURE or X-PAYMENT)
- All pricing is in USDC on Solana unless otherwise specified

## Parameters Schema

```json
{
  "name": "orbitx402_discover",
  "description": "Search for x402-enabled servers and paid API resources across the Solana network",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["discover", "list_servers", "server_detail", "register_server"],
        "description": "The action to perform"
      },
      "query": {
        "type": "string",
        "description": "Natural language search query (for discover action)"
      },
      "chain": {
        "type": "string",
        "description": "Filter by blockchain (e.g., 'solana', 'base')"
      },
      "facilitator": {
        "type": "string",
        "description": "Filter by payment facilitator (e.g., 'dexter', 'payAI', 'relai')"
      },
      "search": {
        "type": "string",
        "description": "Keyword search for list_servers"
      },
      "server_url": {
        "type": "string",
        "description": "Server URL (for server_detail or register_server)"
      }
    },
    "required": ["action"]
  }
}
```
