'use client';

import { useRef, useEffect } from 'react';

interface MapNode {
  id: string;
  label: string;
  type: 'facilitator' | 'participant';
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  txCount: number;
}

interface MapEdge {
  from: string;
  to: string;
  amount: number;
  count: number;
}

interface NetworkMapProps {
  facilitators: any[];
  transfers: any[];
}

const FACILITATOR_COLORS: Record<string, string> = {
  payai: '#9F3EC9',
  dexter: '#DD903A',
  relai: '#8B5CF6',
};

export default function NetworkMap({ facilitators, transfers }: NetworkMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(2, 2);
    };
    resize();

    const w = container.getBoundingClientRect().width;
    const h = container.getBoundingClientRect().height;
    const cx = w / 2;
    const cy = h / 2;

    const nodes: MapNode[] = [];
    const edges: MapEdge[] = [];
    const nodeMap = new Map<string, MapNode>();

    // Facilitator nodes
    facilitators.forEach((f, i) => {
      const angle = (i / facilitators.length) * Math.PI * 2 - Math.PI / 2;
      const node: MapNode = {
        id: f.id,
        label: f.name,
        type: 'facilitator',
        color: f.color || FACILITATOR_COLORS[f.id] || '#666',
        x: cx + Math.cos(angle) * 80,
        y: cy + Math.sin(angle) * 80,
        vx: 0, vy: 0,
        radius: 22,
        txCount: f.stats?.totalTransactions || 0,
      };
      nodes.push(node);
      nodeMap.set(f.id, node);
      f.addresses?.forEach((a: any) => nodeMap.set(a.address, node));
    });

    // Participants
    const participantTxCount = new Map<string, number>();
    const facAddresses = new Set(facilitators.flatMap((f: any) => f.addresses?.map((a: any) => a.address) || []));

    transfers.slice(0, 200).forEach((t: any) => {
      const counterparty = facAddresses.has(t.sender) ? t.receiver : t.sender;
      if (counterparty && !facAddresses.has(counterparty) && !nodeMap.has(counterparty)) {
        participantTxCount.set(counterparty, (participantTxCount.get(counterparty) || 0) + 1);
      }
      const edgeKey = `${t.facilitatorId}-${facAddresses.has(t.sender) ? t.receiver : t.sender}`;
      const existing = edges.find(e => `${e.from}-${e.to}` === edgeKey);
      if (existing) { existing.amount += t.amount; existing.count += 1; }
      else { edges.push({ from: t.facilitatorId, to: facAddresses.has(t.sender) ? t.receiver : t.sender, amount: t.amount, count: 1 }); }
    });

    const topParticipants = [...participantTxCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    topParticipants.forEach(([addr, count], i) => {
      const angle = (i / topParticipants.length) * Math.PI * 2;
      const dist = 130 + Math.random() * 60;
      const node: MapNode = {
        id: addr, label: addr.slice(0, 4) + '..' + addr.slice(-4), type: 'participant',
        color: '#404040',
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        vx: 0, vy: 0, radius: Math.min(5 + count * 2, 14), txCount: count,
      };
      nodes.push(node); nodeMap.set(addr, node);
    });

    function simulate() {
      for (const node of nodes) {
        const dx = cx - node.x, dy = cy - node.y;
        node.vx += dx * 0.0003; node.vy += dy * 0.0003;
        for (const other of nodes) {
          if (other === node) continue;
          const rx = node.x - other.x, ry = node.y - other.y;
          const dist = Math.sqrt(rx * rx + ry * ry) || 1;
          const minDist = node.radius + other.radius + 10;
          if (dist < minDist) { const f = (minDist - dist) / dist * 0.5; node.vx += rx * f; node.vy += ry * f; }
        }
        node.vx *= 0.85; node.vy *= 0.85;
        node.x += node.vx; node.y += node.vy;
        node.x = Math.max(node.radius, Math.min(w - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(h - node.radius, node.y));
      }
    }

    function render() {
      ctx.clearRect(0, 0, w, h);

      // Edges
      for (const edge of edges) {
        const from = nodeMap.get(edge.from), to = nodeMap.get(edge.to);
        if (!from || !to) continue;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = Math.min(1 + edge.count * 0.2, 2.5);
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        if (node.type === 'facilitator') {
          const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2.5);
          g.addColorStop(0, node.color + '18'); g.addColorStop(1, node.color + '00');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(node.x, node.y, node.radius * 2.5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'facilitator' ? node.color + '25' : 'rgba(255,255,255,0.03)';
        ctx.fill();
        ctx.strokeStyle = node.type === 'facilitator' ? node.color + '80' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = node.type === 'facilitator' ? 1.5 : 0.5;
        ctx.stroke();

        ctx.fillStyle = node.type === 'facilitator' ? '#e5e5e5' : '#525252';
        ctx.font = node.type === 'facilitator' ? '600 11px system-ui' : '9px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y + node.radius + 13);
      }

      simulate();
      animRef.current = requestAnimationFrame(render);
    }

    render();
    return () => { cancelAnimationFrame(animRef.current); };
  }, [facilitators, transfers]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
        <span className="section-label">Network Map</span>
        <span className="text-[11px] text-neutral-600">Solana USDC</span>
      </div>
      <div ref={containerRef} className="dot-grid" style={{ width: '100%', height: 400 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
