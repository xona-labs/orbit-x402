# OrbitX402 Discovery

Discover x402-enabled servers and the paid API resources they expose across the Solana network. OrbitX402 indexes x402 servers, probes their `/.well-known/x402` endpoints, and provides LLM-powered natural language search — so agents can find the right server + endpoint and call it with USDC.

## Capabilities

- **Discover** servers and resources by natural language prompt
- **List servers** with filtering by chain and keyword
- **List resources** (endpoints) across all servers with method/server/keyword filters
- **Get server details** including the full endpoint list with pricing
- **Register new servers** to make them discoverable

## Base URL

```
https://api.orbitx402.com
```

## Actions

### 1. discover — Natural Language Search (Recommended)

Send a natural language query to find the most relevant servers and their endpoints.

```
POST /api/discover
Content-Type: application/json

{ "query": "find image generation APIs on Solana" }
```

Response includes ranked servers with their endpoints, pricing, stats, and a relevance reason.

**Example queries:**
- "cheapest LLM inference"
- "blockchain analytics endpoints"
- "image generation or creative AI"
- "email sending services"
- "search or web crawling APIs"

### 2. list_servers — Browse All Servers

```
GET /api/servers
GET /api/servers?chain=solana
GET /api/servers?search=analytics
```

Returns paginated servers with stats (transactions, volume, buyers) and resource counts.

### 3. list_resources — Browse the Resource Catalog

```
GET /api/resources
GET /api/resources?search=image+generation
GET /api/resources?method=POST
GET /api/resources?server=https://api.nansen.ai
```

Returns paginated x402 endpoints with `slug`, `endpoint`, `method`, `description`, `pricing`, and `serverUrl`.

### 4. server_detail — Get Server + Endpoints

```
GET /api/servers/detail?url=https://api.nansen.ai
```

Returns the full server info plus every x402 endpoint it exposes.

### 5. register_server — Register a New Server

```
POST /api/servers/register
Content-Type: application/json

{ "url": "https://your-server.com" }
```

The system probes `/.well-known/x402` to discover endpoints automatically.

## Guidelines

- Use `discover` first — it ranks servers + endpoints by relevance for any natural language query
- Use `list_resources` when the agent already knows what kind of endpoint it needs (by method/keyword)
- Use `list_servers` to browse providers, then `server_detail` for the full endpoint list
- When calling an x402 endpoint, include a valid x402 payment header (`X-PAYMENT`)
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
        "enum": ["discover", "list_servers", "list_resources", "server_detail", "register_server"],
        "description": "The action to perform"
      },
      "query": {
        "type": "string",
        "description": "Natural language search query (for discover action)"
      },
      "chain": {
        "type": "string",
        "description": "Filter servers by blockchain (e.g., 'solana', 'base')"
      },
      "search": {
        "type": "string",
        "description": "Keyword search for list_servers or list_resources"
      },
      "method": {
        "type": "string",
        "description": "Filter resources by HTTP method (GET, POST, etc.)"
      },
      "server_url": {
        "type": "string",
        "description": "Server URL (for list_resources filter, server_detail, or register_server)"
      }
    },
    "required": ["action"]
  }
}
```
