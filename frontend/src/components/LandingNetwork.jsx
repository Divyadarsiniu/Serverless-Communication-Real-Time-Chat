import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Cloud, Wifi, Shield, CheckCircle2 } from 'lucide-react';

export default function LandingNetwork() {
  const { isDark } = useTheme();
  const [activeNode, setActiveNode] = useState(null);

  // Nodes in the communication canvas
  const nodes = [
    { id: 'alice', x: 120, y: 110, name: 'Alice', role: 'Cloud Engineer', status: 'Online', color: '#6366f1' },
    { id: 'bob', x: 440, y: 90, name: 'Bob', role: 'DevOps Architect', status: 'Active (2 devices)', color: '#06b6d4' },
    { id: 'you', x: 280, y: 220, name: 'You', role: 'Active Client', status: 'Connected', color: '#10b981' },
    { id: 'charlie', x: 150, y: 340, name: 'Charlie', role: 'Security Lead', status: 'Online', color: '#a855f7' },
    { id: 'cloud', x: 420, y: 320, name: 'AWS Gateway', role: 'WebSocket Core', status: 'Serverless Node', color: '#f59e0b', isGateway: true }
  ];

  // Connection vectors
  const edges = [
    { from: 'alice', to: 'you' },
    { from: 'bob', to: 'you' },
    { from: 'you', to: 'cloud' },
    { from: 'you', to: 'charlie' },
    { from: 'alice', to: 'charlie' },
    { from: 'bob', to: 'cloud' }
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        height: '420px',
        margin: '0 auto',
        borderRadius: '24px',
        background: isDark
          ? 'radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.4) 0%, rgba(10, 15, 29, 0.8) 100%)'
          : 'radial-gradient(circle at 50% 50%, rgba(224, 231, 255, 0.5) 0%, rgba(248, 250, 252, 0.8) 100%)',
        border: '1px solid var(--border-color)',
        boxShadow: isDark ? '0 20px 40px -15px rgba(0, 0, 0, 0.7)' : '0 20px 40px -15px rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden'
      }}
    >
      {/* SVG Canvas for vectors and animated signal particles */}
      <svg width="100%" height="100%" viewBox="0 0 560 420" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#6366f1' : '#4f46e5'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isDark ? '#06b6d4' : '#0891b2'} stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Connection Lines */}
        {edges.map((edge, i) => {
          const n1 = nodeMap[edge.from];
          const n2 = nodeMap[edge.to];
          const isHighlighted = activeNode && (activeNode.id === edge.from || activeNode.id === edge.to);

          return (
            <g key={i}>
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={isHighlighted ? (isDark ? '#38bdf8' : '#6366f1') : 'url(#edgeGrad)'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeDasharray={isHighlighted ? 'none' : '4, 4'}
                style={{
                  transition: 'stroke 0.3s, stroke-width 0.3s',
                  filter: isHighlighted ? 'url(#glow)' : 'none'
                }}
              />
              {/* Animated Particle traveling along the connection */}
              <circle
                r="3"
                fill={isDark ? '#38bdf8' : '#4f46e5'}
                style={{
                  filter: 'url(#glow)'
                }}
              >
                <animateMotion
                  path={`M ${n1.x} ${n1.y} L ${n2.x} ${n2.y}`}
                  dur={`${3 + (i % 3)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Interactive Floating Nodes */}
      {nodes.map((node) => {
        const isHovered = activeNode?.id === node.id;

        return (
          <div
            key={node.id}
            onMouseEnter={() => setActiveNode(node)}
            onMouseLeave={() => setActiveNode(null)}
            style={{
              position: 'absolute',
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              zIndex: isHovered ? 10 : 2
            }}
          >
            {/* Outer Pulse Ring */}
            <div
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                border: `1.5px solid ${node.color}`,
                opacity: isHovered ? 0.8 : 0.3,
                animation: 'pulse 2.5s infinite'
              }}
            />

            {/* Core Node Disc */}
            <div
              style={{
                width: node.isGateway ? '46px' : '38px',
                height: node.isGateway ? '46px' : '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                border: `2px solid ${node.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark
                  ? `0 0 16px ${node.color}66`
                  : `0 4px 12px ${node.color}33`
              }}
            >
              {node.isGateway ? (
                <Cloud size={20} color={node.color} />
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: node.color }}>
                  {node.name[0]}
                </span>
              )}
            </div>

            {/* Label Under Node */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '6px',
                whiteSpace: 'nowrap',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textShadow: isDark ? '0 1px 4px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              {node.name}
            </div>

            {/* Expanded Tooltip Card on Hover */}
            {isHovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.65rem 0.85rem',
                  boxShadow: 'var(--shadow-lg)',
                  fontSize: '0.72rem',
                  minWidth: '150px',
                  zIndex: 20,
                  pointerEvents: 'none',
                  animation: 'fadeInUp 0.2s ease-out'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{node.name}</span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{node.role}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                  Status: {node.status}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom Floating Status Banner */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '9999px',
          padding: '0.35rem 0.85rem',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
        <span>Live Mesh: Hover nodes to inspect real-time signal paths</span>
      </div>
    </div>
  );
}
