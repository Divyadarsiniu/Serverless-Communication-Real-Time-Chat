import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 'md', showText = true, animated = true, className = '' }) {
  const { isDark } = useTheme();

  // Size dimensions
  const dims = {
    sm: { icon: 26, fontSize: '1rem', gap: '0.45rem' },
    md: { icon: 34, fontSize: '1.25rem', gap: '0.65rem' },
    lg: { icon: 48, fontSize: '1.75rem', gap: '0.85rem' },
    xl: { icon: 64, fontSize: '2.25rem', gap: '1rem' }
  }[size] || { icon: 34, fontSize: '1.25rem', gap: '0.65rem' };

  // Theme colors
  const primaryColor = isDark ? '#6366f1' : '#4f46e5';
  const secondaryColor = isDark ? '#06b6d4' : '#0891b2';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const glowFilter = isDark ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.6))' : 'none';

  return (
    <div
      className={`yapper-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        userSelect: 'none',
        textDecoration: 'none'
      }}
    >
      {/* SVG Icon: Intertwined Signal Nodes & Conversation Flow */}
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: glowFilter, flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="yapperGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <linearGradient id="yapperGrad2" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={secondaryColor} />
            <stop offset="100%" stopColor={primaryColor} />
          </linearGradient>
        </defs>

        {/* Primary Node Loop (Left / Voice A) */}
        <path
          d="M16 12C9.37 12 4 17.37 4 24C4 30.63 9.37 36 16 36C18.2 36 20.25 35.41 22 34.38L27 38L25.65 31.83C27.12 29.62 28 26.92 28 24C28 17.37 22.63 12 16 12Z"
          stroke="url(#yapperGrad1)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />

        {/* Secondary Node Loop (Right / Signal B - Intertwined) */}
        <path
          d="M32 36C38.63 36 44 30.63 44 24C44 17.37 38.63 12 32 12C29.8 12 27.75 12.59 26 13.62L21 10L22.35 16.17C20.88 18.38 20 21.08 20 24C20 30.63 25.37 36 32 36Z"
          stroke="url(#yapperGrad2)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Signal Connection Nodes */}
        <circle cx="16" cy="24" r="3" fill={primaryColor} />
        <circle cx="32" cy="24" r="3" fill={secondaryColor} />

        {/* Dynamic Center Pulse */}
        <circle
          cx="24"
          cy="24"
          r="2.2"
          fill={isDark ? '#38bdf8' : '#6366f1'}
          className={animated ? 'yapper-pulse-dot' : ''}
        />
      </svg>

      {/* Brand Wordmark */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontSize: dims.fontSize,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: textColor,
              display: 'flex',
              alignItems: 'baseline',
              fontFamily: 'inherit'
            }}
          >
            <span>yapper</span>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: secondaryColor,
                marginLeft: '2px',
                boxShadow: isDark ? `0 0 8px ${secondaryColor}` : 'none'
              }}
            />
          </span>
          {size === 'lg' && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginTop: '3px'
              }}
            >
              Real-Time Cloud Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
